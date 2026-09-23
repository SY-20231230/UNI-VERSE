package com.universe.report.service;

import com.universe.report.dto.request.ReportCreateRequest;
import com.universe.report.entity.*;
import com.universe.report.repository.*;
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
}
