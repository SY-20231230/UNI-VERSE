package com.universe.admin.service;

import com.universe.admin.dto.request.UserSanctionCreateRequest;
import com.universe.notification.event.SanctionImposedEvent;
import com.universe.report.entity.*;
import com.universe.report.repository.*;
import com.universe.report.service.*;
import com.universe.trust.service.TrustScoreService;
import com.universe.user.entity.*;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminSanctionServiceTest {
    @Mock ModerationAccessService access;
    @Mock ModerationUserRepository users;
    @Mock UserSanctionRepository sanctions;
    @Mock ReportRepository reports;
    @Mock TrustScoreService trust;
    @Mock ApplicationEventPublisher events;
    @InjectMocks AdminSanctionService service;
    User admin;
    User target;

    @BeforeEach void setup() {
        admin = user(1L, UserRole.ADMIN, AccountStatus.ACTIVE);
        target = user(2L, UserRole.USER, AccountStatus.ACTIVE);
        lenient().when(sanctions.save(any())).thenAnswer(call -> {
            UserSanction saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 100L);
            return saved;
        });
    }

    private User user(long id, UserRole role, AccountStatus status) {
        User user = User.builder().email(id + "@test.example").password("test")
                .name("name").nickname("nick").build();
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "role", role);
        user.updateAccountStatus(status);
        return user;
    }

    @Test void warningDeductsThroughTrustServiceAndPublishesEvent() {
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(users.findLockedById(2L)).thenReturn(Optional.of(target));

        var response = service.create(1L, 2L,
                new UserSanctionCreateRequest(SanctionType.WARNING, "reviewed", null, null));

        ArgumentCaptor<UserSanction> saved = ArgumentCaptor.forClass(UserSanction.class);
        verify(sanctions).save(saved.capture());
        verify(trust).applyWarning(saved.getValue());
        verify(events).publishEvent(new SanctionImposedEvent(100L, 2L, SanctionType.WARNING, null));
        assertThat(response.sanctionId()).isEqualTo(100L);
        assertThat(target.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
    }

    @Test void suspensionAndBanChangeAccountStatusAndDeductTrust() {
        LocalDateTime endAt = LocalDateTime.now().plusDays(3);
        UserSanction suspension = service.impose(admin, target, null, SanctionType.SUSPENSION, "temporary", endAt);
        assertThat(target.getAccountStatus()).isEqualTo(AccountStatus.SUSPENDED);
        assertThat(suspension.getEndAt()).isEqualTo(endAt);

        target.updateAccountStatus(AccountStatus.ACTIVE);
        UserSanction ban = service.impose(admin, target, null, SanctionType.BAN, "permanent", null);
        assertThat(target.getAccountStatus()).isEqualTo(AccountStatus.BANNED);
        assertThat(ban.getEndAt()).isNull();
        verify(trust).applySuspension(suspension);
        verify(trust).applyBan(ban);
        verify(trust, never()).applyWarning(any());
    }

    @Test void linkedReportMustBeProcessedAndTargetTheSameUserBeforeUserLock() {
        User other = user(3L, UserRole.USER, AccountStatus.ACTIVE);
        Report pending = Report.builder().targetUser(target).build();
        ReflectionTestUtils.setField(pending, "id", 7L);
        Report wrongTarget = Report.builder().targetUser(other).build();
        ReflectionTestUtils.setField(wrongTarget, "id", 8L);
        ReflectionTestUtils.setField(wrongTarget, "status", ReportStatus.PROCESSED);
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(reports.findLockedById(7L)).thenReturn(Optional.of(pending));
        when(reports.findLockedById(8L)).thenReturn(Optional.of(wrongTarget));

        assertThatThrownBy(() -> service.create(1L, 2L,
                new UserSanctionCreateRequest(SanctionType.WARNING, "reason", null, 7L)))
                .isInstanceOf(ModerationException.class);
        assertThatThrownBy(() -> service.create(1L, 2L,
                new UserSanctionCreateRequest(SanctionType.WARNING, "reason", null, 8L)))
                .isInstanceOf(ModerationException.class);
        verifyNoInteractions(users);
    }

    @Test void validReportIsLockedBeforeTargetUser() {
        Report processed = Report.builder().targetUser(target).build();
        ReflectionTestUtils.setField(processed, "id", 7L);
        ReflectionTestUtils.setField(processed, "status", ReportStatus.PROCESSED);
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(reports.findLockedById(7L)).thenReturn(Optional.of(processed));
        when(users.findLockedById(2L)).thenReturn(Optional.of(target));

        service.create(1L, 2L, new UserSanctionCreateRequest(SanctionType.WARNING, "reason", null, 7L));

        InOrder locks = inOrder(reports, users);
        locks.verify(reports).findLockedById(7L);
        locks.verify(users).findLockedById(2L);
    }

    @Test void rejectsSelfSanctionAdminTargetAndTerminalAccounts() {
        assertForbidden(() -> service.impose(admin, admin, null, SanctionType.WARNING, "reason", null));
        assertForbidden(() -> service.impose(admin, user(3L, UserRole.ADMIN, AccountStatus.ACTIVE),
                null, SanctionType.WARNING, "reason", null));
        assertForbidden(() -> service.impose(admin, user(4L, UserRole.USER, AccountStatus.DELETED),
                null, SanctionType.WARNING, "reason", null));
        assertForbidden(() -> service.impose(admin, user(5L, UserRole.USER, AccountStatus.BANNED),
                null, SanctionType.WARNING, "reason", null));
        verifyNoInteractions(events);
    }

    @Test void validatesReasonEndTimeAndDuplicateSuspension() {
        assertInvalid(() -> service.impose(admin, target, null, null, "reason", null));
        assertInvalid(() -> service.impose(admin, target, null, SanctionType.WARNING, " ", null));
        assertInvalid(() -> service.impose(admin, target, null, SanctionType.WARNING, "reason", LocalDateTime.now().plusDays(1)));
        assertInvalid(() -> service.impose(admin, target, null, SanctionType.SUSPENSION, "reason", null));
        assertInvalid(() -> service.impose(admin, target, null, SanctionType.SUSPENSION, "reason", LocalDateTime.now().minusSeconds(1)));

        when(sanctions.hasActive(eq(2L), eq(SanctionType.SUSPENSION), any())).thenReturn(true);
        assertInvalid(() -> service.impose(admin, target, null, SanctionType.SUSPENSION,
                "reason", LocalDateTime.now().plusDays(1)));
    }

    private void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode())
                .isEqualTo(ModerationException.Code.FORBIDDEN);
    }

    private void assertInvalid(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode())
                .isEqualTo(ModerationException.Code.INVALID_SANCTION);
    }
}
