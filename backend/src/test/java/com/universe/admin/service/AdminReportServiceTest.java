package com.universe.admin.service;

import com.universe.admin.dto.request.ReportApproveRequest;
import com.universe.admin.dto.request.ReportDismissRequest;
import com.universe.admin.repository.AdminReportRepository;
import com.universe.notification.event.ReportProcessedEvent;
import com.universe.report.entity.Report;
import com.universe.report.entity.ReportEvidence;
import com.universe.report.entity.ReportStatus;
import com.universe.report.entity.ReportType;
import com.universe.report.entity.SanctionType;
import com.universe.report.entity.UserSanction;
import com.universe.report.repository.ModerationUserRepository;
import com.universe.report.repository.ReportEvidenceRepository;
import com.universe.report.repository.ReportRepository;
import com.universe.report.service.ModerationAccessService;
import com.universe.report.service.ModerationException;
import com.universe.trust.service.TrustScoreService;
import com.universe.user.entity.AccountStatus;
import com.universe.user.entity.User;
import com.universe.user.entity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminReportServiceTest {
    @Mock ModerationAccessService access;
    @Mock AdminReportRepository searchReports;
    @Mock ReportRepository reports;
    @Mock ReportEvidenceRepository evidences;
    @Mock ModerationUserRepository users;
    @Mock TrustScoreService trust;
    @Mock AdminSanctionService sanctions;
    @Mock ReportSuspensionPolicy suspensionPolicy;
    @Mock ApplicationEventPublisher events;
    @InjectMocks AdminReportService service;

    User admin;
    User reporter;
    User target;
    Report report;

    @BeforeEach void setup() {
        admin = user(1L, UserRole.ADMIN);
        reporter = user(2L, UserRole.USER);
        target = user(3L, UserRole.USER);
        report = Report.builder().reporter(reporter).targetUser(target)
                .reportType(ReportType.SCAM).description("description").build();
        ReflectionTestUtils.setField(report, "id", 7L);
    }

    @Test void detailRequiresAdminAndMapsEvidenceWithoutReturningEntities() {
        ReportEvidence evidence = ReportEvidence.builder().report(report).fileUrl("https://files.example/proof.png").build();
        ReflectionTestUtils.setField(evidence, "id", 8L);
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(reports.findById(7L)).thenReturn(Optional.of(report));
        when(evidences.findByReportIdOrderByIdAsc(7L)).thenReturn(List.of(evidence));

        var detail = service.getDetail(1L, 7L);

        assertThat(detail.report().reportId()).isEqualTo(7L);
        assertThat(detail.reporterId()).isEqualTo(2L);
        assertThat(detail.targetUser().userId()).isEqualTo(3L);
        assertThat(detail.evidences()).singleElement()
                .satisfies(result -> assertThat(result.fileUrl()).isEqualTo("https://files.example/proof.png"));
    }

    @Test void dismissProcessesOnlyPendingReportAndPublishesResult() {
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(reports.findLockedById(7L)).thenReturn(Optional.of(report));

        var response = service.dismiss(1L, 7L, new ReportDismissRequest("not confirmed"));

        assertThat(response.status()).isEqualTo(ReportStatus.REJECTED);
        assertThat(report.getAdmin()).isSameAs(admin);
        assertThat(report.getAdminNote()).isEqualTo("not confirmed");
        verify(events).publishEvent(new ReportProcessedEvent(7L, 2L, false));
        verifyNoInteractions(trust, sanctions);
    }

    @Test void secondProcessingAttemptIsRejectedWithoutSideEffects() {
        report.dismiss(admin, "already reviewed");
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(reports.findLockedById(7L)).thenReturn(Optional.of(report));

        assertCode(() -> service.dismiss(1L, 7L, new ReportDismissRequest("again")),
                ModerationException.Code.REPORT_ALREADY_PROCESSED);

        verifyNoInteractions(trust, sanctions, events);
    }

    @Test void approveConfirmsScoreThenAppliesOptionalSanctionAndPublishesEvent() {
        UserSanction warning = UserSanction.builder().user(target).admin(admin).report(report)
                .sanctionType(SanctionType.WARNING).reason("confirmed").build();
        ReflectionTestUtils.setField(warning, "id", 9L);
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(reports.findLockedById(7L)).thenReturn(Optional.of(report));
        when(users.findLockedById(3L)).thenReturn(Optional.of(target));
        doAnswer(call -> {
            target.addTrustScore(30 - target.getTrustScore());
            return null;
        }).when(trust).confirmReport(report);
        when(sanctions.impose(admin, target, report, SanctionType.WARNING, "confirmed", null))
                .thenReturn(warning);

        var response = service.approve(1L, 7L, new ReportApproveRequest("confirmed", SanctionType.WARNING));

        assertThat(response.report().status()).isEqualTo(ReportStatus.PROCESSED);
        assertThat(response.trustScore()).isEqualTo(30);
        assertThat(response.sanction().sanctionId()).isEqualTo(9L);
        InOrder order = inOrder(trust, sanctions, events);
        order.verify(trust).confirmReport(report);
        order.verify(sanctions).impose(admin, target, report, SanctionType.WARNING, "confirmed", null);
        order.verify(events).publishEvent(new ReportProcessedEvent(7L, 2L, true));
    }

    @Test void approveWithSuspensionDaysUsesChosenPeriodInsteadOfPolicy() {
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(reports.findLockedById(7L)).thenReturn(Optional.of(report));
        when(users.findLockedById(3L)).thenReturn(Optional.of(target));

        java.time.LocalDateTime before = java.time.LocalDateTime.now();
        service.approve(1L, 7L, new ReportApproveRequest("confirmed", SanctionType.SUSPENSION, 7));

        var endAt = org.mockito.ArgumentCaptor.forClass(java.time.LocalDateTime.class);
        verify(sanctions).impose(eq(admin), eq(target), eq(report), eq(SanctionType.SUSPENSION), eq("confirmed"), endAt.capture());
        assertThat(endAt.getValue()).isBetween(before.plusDays(7), java.time.LocalDateTime.now().plusDays(7));
        verifyNoInteractions(suspensionPolicy);
    }

    @Test void involvedAdminAndProtectedTargetCannotApproveReport() {
        when(reports.findLockedById(7L)).thenReturn(Optional.of(report));
        when(access.requireAdmin(2L)).thenReturn(reporter);
        assertCode(() -> service.approve(2L, 7L, new ReportApproveRequest("confirmed", null)),
                ModerationException.Code.FORBIDDEN);

        User protectedAdmin = user(4L, UserRole.ADMIN);
        Report protectedReport = Report.builder().reporter(reporter).targetUser(protectedAdmin)
                .reportType(ReportType.SCAM).description("description").build();
        ReflectionTestUtils.setField(protectedReport, "id", 10L);
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(reports.findLockedById(10L)).thenReturn(Optional.of(protectedReport));
        when(users.findLockedById(4L)).thenReturn(Optional.of(protectedAdmin));

        assertCode(() -> service.approve(1L, 10L, new ReportApproveRequest("confirmed", null)),
                ModerationException.Code.FORBIDDEN);
        verifyNoInteractions(trust, sanctions, events);
    }

    private User user(long id, UserRole role) {
        User user = User.builder().email(id + "@test.example").password("secret")
                .name("name").nickname("nick").build();
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "role", role);
        user.updateAccountStatus(AccountStatus.ACTIVE);
        user.addTrustScore(50);
        return user;
    }

    private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action,
                            ModerationException.Code code) {
        assertThatThrownBy(action).isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode()).isEqualTo(code);
    }
}
