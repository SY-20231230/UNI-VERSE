package com.universe.report.service;

import com.universe.report.dto.request.ReportCreateRequest;
import com.universe.report.entity.*;
import com.universe.report.repository.*;
import com.universe.school.entity.School;
import com.universe.market.entity.*;
import com.universe.community.entity.*;
import com.universe.trade.entity.Trade;
import com.universe.user.entity.User;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {
    @Mock ReportRepository reports;
    @Mock ReportEvidenceRepository evidences;
    @Mock ModerationUserRepository users;
    @Mock ReportReferenceRepository references;
    @Mock ModerationAccessService access;
    @Mock ReportEvidencePolicy policy;
    @Mock com.universe.file.service.FileService fileService;
    @InjectMocks ReportService service;

    User user(long id) {
        User u = User.builder().email(id + "@test.example").password("test").name("name").nickname("nick").build();
        ReflectionTestUtils.setField(u, "id", id);
        u.addTrustScore(50);
        return u;
    }

    @Test void registrationDoesNotChangeScoreAndDerivesReporterFromAuthenticatedId() {
        User reporter = user(1), target = user(2);
        when(access.requireActiveUser(1L)).thenReturn(reporter);
        when(users.findById(2L)).thenReturn(Optional.of(target));
        when(reports.save(any())).thenAnswer(call -> call.getArgument(0));
        service.create(1L, new ReportCreateRequest(2L, null, null, null, ReportType.SCAM, "description", null));
        ArgumentCaptor<Report> captor = ArgumentCaptor.forClass(Report.class);
        verify(reports).save(captor.capture());
        assertThat(captor.getValue().getReporter()).isSameAs(reporter);
        assertThat(captor.getValue().getStatus()).isEqualTo(ReportStatus.PENDING);
        assertThat(target.getTrustScore()).isEqualTo(50);
    }

    @Test void rejectsSelfReport() {
        User reporter = user(1);
        when(access.requireActiveUser(1L)).thenReturn(reporter);
        when(users.findById(1L)).thenReturn(Optional.of(reporter));
        assertThatThrownBy(() -> service.create(1L,
                new ReportCreateRequest(1L, null, null, null, ReportType.SCAM, "reason", null)))
                .isInstanceOf(ModerationException.class);
        verifyNoInteractions(reports, evidences);
    }

    @Test void rejectsUnknownTargetBeforeLoadingReferences() {
        User reporter = user(1);
        when(access.requireActiveUser(1L)).thenReturn(reporter);
        when(users.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(1L,
                new ReportCreateRequest(99L, 3L, null, null, ReportType.SCAM, "reason", null)))
                .isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode())
                .isEqualTo(ModerationException.Code.USER_NOT_FOUND);

        verifyNoInteractions(references, reports, evidences, policy);
    }

    @Test void rejectsMissingReferencedResource() {
        User reporter = user(1), target = user(2);
        when(access.requireActiveUser(1L)).thenReturn(reporter);
        when(users.findById(2L)).thenReturn(Optional.of(target));
        when(references.findTrade(3L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(1L,
                new ReportCreateRequest(2L, 3L, null, null, ReportType.SCAM, "reason", null)))
                .isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode())
                .isEqualTo(ModerationException.Code.REFERENCE_NOT_FOUND);

        verifyNoInteractions(reports, evidences, policy);
    }

    @Test void itemReferenceMustBelongToTargetAndReportersVerifiedSchool() {
        School reporterSchool = school(10L, "reporter-school");
        School otherSchool = school(20L, "other-school");
        User reporter = user(1), target = user(2), otherSeller = user(3);
        reporter.verifySchool(reporterSchool);
        MarketItem wrongOwner = item(30L, otherSeller, reporterSchool);
        MarketItem wrongSchool = item(31L, target, otherSchool);
        when(access.requireActiveUser(1L)).thenReturn(reporter);
        when(users.findById(2L)).thenReturn(Optional.of(target));
        when(references.findItem(30L)).thenReturn(Optional.of(wrongOwner));
        when(references.findItem(31L)).thenReturn(Optional.of(wrongSchool));

        assertInvalidTarget(new ReportCreateRequest(2L, null, 30L, null, ReportType.SCAM, "reason", null));
        assertThatThrownBy(() -> service.create(1L,
                new ReportCreateRequest(2L, null, 31L, null, ReportType.SCAM, "reason", null)))
                .isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode())
                .isEqualTo(ModerationException.Code.FORBIDDEN);

        verifyNoInteractions(reports, evidences, policy);
    }

    @Test void tradeReferenceMustConnectReporterAndTargetAndMatchItem() {
        User reporter = user(1), target = user(2), stranger = user(3);
        Trade unrelated = mock(Trade.class);
        when(unrelated.getSeller()).thenReturn(reporter);
        when(unrelated.getBuyer()).thenReturn(stranger);
        when(access.requireActiveUser(1L)).thenReturn(reporter);
        when(users.findById(2L)).thenReturn(Optional.of(target));
        when(references.findTrade(40L)).thenReturn(Optional.of(unrelated));

        assertInvalidTarget(new ReportCreateRequest(2L, 40L, null, null, ReportType.SCAM, "reason", null));
        verifyNoInteractions(reports, evidences, policy);
    }

    @Test void validItemReportPersistsDistinctEvidenceWithoutChangingTargetScore() {
        School school = school(10L, "same-school");
        User reporter = user(1), target = user(2);
        reporter.verifySchool(school);
        MarketItem item = item(30L, target, school);
        String evidence = "https://files.example/reports/proof.png";
        when(access.requireActiveUser(1L)).thenReturn(reporter);
        when(users.findById(2L)).thenReturn(Optional.of(target));
        when(references.findItem(30L)).thenReturn(Optional.of(item));
        when(reports.save(any())).thenAnswer(call -> call.getArgument(0));

        service.create(1L, new ReportCreateRequest(2L, null, 30L, null,
                ReportType.SCAM, "reason", List.of(evidence, evidence)));

        verify(policy).validate(List.of(evidence, evidence));
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ReportEvidence>> savedEvidence = ArgumentCaptor.forClass(List.class);
        verify(evidences).saveAll(savedEvidence.capture());
        assertThat(savedEvidence.getValue()).singleElement()
                .extracting(ReportEvidence::getFileUrl).isEqualTo(evidence);
        assertThat(target.getTrustScore()).isEqualTo(50);
    }

    @Test void hidesAnotherUsersReport() {
        when(reports.findById(4L)).thenReturn(Optional.of(Report.builder().reporter(user(2)).targetUser(user(3)).build()));
        assertThatThrownBy(() -> service.getMine(1L, 4L)).isInstanceOf(ModerationException.class);
        verifyNoInteractions(evidences);
    }

    @Test void passesAuthenticatedIdAndStatusToPagedQuery() {
        Pageable page = PageRequest.of(0, 20);
        when(reports.findByReporterIdAndStatus(1L, ReportStatus.PENDING, page)).thenReturn(Page.empty(page));
        assertThat(service.findMine(1L, ReportStatus.PENDING, page)).isEmpty();
        verify(reports).findByReporterIdAndStatus(1L, ReportStatus.PENDING, page);
    }

    @Test void nullEvidenceIsReportedByBeanValidationInsteadOfFailingDeserialization() {
        var request = new ReportCreateRequest(2L, null, null, null, ReportType.SCAM, "reason", Arrays.asList((String) null));
        try (var factory = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            assertThat(factory.getValidator().validate(request)).isNotEmpty();
        }
    }

    private void assertInvalidTarget(ReportCreateRequest request) {
        assertThatThrownBy(() -> service.create(1L, request))
                .isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode())
                .isEqualTo(ModerationException.Code.INVALID_REPORT_TARGET);
    }

    private School school(long id, String name) {
        School school = School.builder().schoolName(name).emailDomain(name + ".test").build();
        ReflectionTestUtils.setField(school, "id", id);
        return school;
    }

    private MarketItem item(long id, User seller, School school) {
        MarketItem item = MarketItem.builder().seller(seller).school(school).title("item")
                .category(ItemCategory.ETC).itemCondition(ItemCondition.GOOD)
                .purchasePrice(1000L).listedPrice(800L).description("description").build();
        ReflectionTestUtils.setField(item, "id", id);
        return item;
    }
}
