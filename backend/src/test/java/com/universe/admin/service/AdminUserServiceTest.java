package com.universe.admin.service;

import com.universe.admin.dto.request.UserStatusUpdateRequest;
import com.universe.admin.repository.*;
import com.universe.report.entity.*;
import com.universe.report.repository.*;
import com.universe.report.service.*;
import com.universe.user.entity.*;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {
    @Mock ModerationAccessService access;
    @Mock AdminUserRepository searchUsers;
    @Mock ModerationUserRepository users;
    @Mock UserSanctionRepository sanctions;
    @Mock ReportRepository reports;
    @Mock AdminActivityRepository activities;
    @Mock SuspensionReleaseService release;
    @InjectMocks AdminUserService service;
    User admin;
    User target;

    @BeforeEach void setup() {
        admin = user(1L, UserRole.ADMIN, AccountStatus.ACTIVE);
        target = user(2L, UserRole.USER, AccountStatus.ACTIVE);
    }

    private User user(long id, UserRole role, AccountStatus status) {
        User user = User.builder().email(id + "@test.example").password("secret")
                .name("name").nickname("nick").build();
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "role", role);
        user.updateAccountStatus(status);
        return user;
    }

    @Test void detailRequiresAdminAndExistingTargetBeforeActivityQueries() {
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(users.findById(2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getDetail(1L, 2L))
                .isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode())
                .isEqualTo(ModerationException.Code.USER_NOT_FOUND);
        verifyNoInteractions(activities, reports, sanctions);
    }

    @Test void detailUsesBoundedRecentPagesAndAggregateTotals() {
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(users.findById(2L)).thenReturn(Optional.of(target));
        Pageable recent = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "id"));
        when(activities.findByParticipant(2L, recent)).thenReturn(Page.empty(recent));
        when(reports.findByTargetUserId(2L, recent)).thenReturn(new PageImpl<>(java.util.List.of(), recent, 12));
        when(sanctions.findByUserId(2L, recent)).thenReturn(new PageImpl<>(java.util.List.of(), recent, 4));

        var detail = service.getDetail(1L, 2L);

        assertThat(detail.user().userId()).isEqualTo(2L);
        assertThat(detail.reportCount()).isEqualTo(12);
        assertThat(detail.sanctionCount()).isEqualTo(4);
        assertThat(detail.recentReports()).isEmpty();
        verify(activities).findByParticipant(2L, recent);
    }

    @Test void sanctionHistoryChecksTargetExistenceAndKeepsRequestedPage() {
        Pageable page = PageRequest.of(2, 5);
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(users.findById(2L)).thenReturn(Optional.of(target));
        when(sanctions.findByUserId(2L, page)).thenReturn(Page.empty(page));

        assertThat(service.findSanctions(1L, 2L, page)).isEmpty();
        verify(sanctions).findByUserId(2L, page);
    }

    @Test void sameStatusIsIdempotentWithoutReleaseOrSanctionChecks() {
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(users.findLockedById(2L)).thenReturn(Optional.of(target));

        var response = service.updateStatus(1L, 2L, new UserStatusUpdateRequest(AccountStatus.ACTIVE));

        assertThat(response.accountStatus()).isEqualTo(AccountStatus.ACTIVE);
        verifyNoInteractions(release, sanctions);
    }

    @Test void activeTransitionFailsWhenReleaseIsRefused() {
        target.updateAccountStatus(AccountStatus.SUSPENDED);
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(users.findLockedById(2L)).thenReturn(Optional.of(target));
        when(release.releaseIfExpired(eq(2L), any(LocalDateTime.class)))
                .thenReturn(false)
                .thenAnswer(call -> {
                    target.updateAccountStatus(AccountStatus.ACTIVE);
                    return true;
                });

        assertThatThrownBy(() -> service.updateStatus(1L, 2L, new UserStatusUpdateRequest(AccountStatus.ACTIVE)))
                .isInstanceOf(ModerationException.class);
        target.updateAccountStatus(AccountStatus.SUSPENDED);
        assertThat(service.updateStatus(1L, 2L, new UserStatusUpdateRequest(AccountStatus.ACTIVE)).accountStatus())
                .isEqualTo(AccountStatus.ACTIVE);
        verify(release, times(2)).releaseIfExpired(eq(2L), any(LocalDateTime.class));
    }

    @Test void adminCanReleaseSuspensionBeforeItsEnd() {
        target.updateAccountStatus(AccountStatus.SUSPENDED);
        UserSanction suspension = UserSanction.builder().user(target).admin(admin).sanctionType(SanctionType.SUSPENSION)
                .reason("욕설").startAt(LocalDateTime.now().minusDays(1)).endAt(LocalDateTime.now().plusDays(6)).build();
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(users.findLockedById(2L)).thenReturn(Optional.of(target));
        when(sanctions.findFirstByUserIdAndSanctionTypeOrderByStartAtDescIdDesc(2L, SanctionType.SUSPENSION))
                .thenReturn(Optional.of(suspension));
        when(release.releaseIfExpired(eq(2L), any(LocalDateTime.class))).thenAnswer(call -> {
            target.updateAccountStatus(AccountStatus.ACTIVE);
            return true;
        });

        assertThat(service.updateStatus(1L, 2L, new UserStatusUpdateRequest(AccountStatus.ACTIVE)).accountStatus())
                .isEqualTo(AccountStatus.ACTIVE);
        assertThat(suspension.getEndAt()).isBeforeOrEqualTo(LocalDateTime.now());
    }

    @Test void punitiveStatusRequiresMatchingActiveSanction() {
        when(access.requireAdmin(1L)).thenReturn(admin);
        when(users.findLockedById(2L)).thenReturn(Optional.of(target));
        when(sanctions.hasActive(eq(2L), eq(SanctionType.SUSPENSION), any())).thenReturn(false, true);

        assertThatThrownBy(() -> service.updateStatus(1L, 2L, new UserStatusUpdateRequest(AccountStatus.SUSPENDED)))
                .isInstanceOf(ModerationException.class);
        assertThat(service.updateStatus(1L, 2L, new UserStatusUpdateRequest(AccountStatus.SUSPENDED)).accountStatus())
                .isEqualTo(AccountStatus.SUSPENDED);

        target.updateAccountStatus(AccountStatus.ACTIVE);
        when(sanctions.hasActive(eq(2L), eq(SanctionType.BAN), any())).thenReturn(true);
        assertThat(service.updateStatus(1L, 2L, new UserStatusUpdateRequest(AccountStatus.BANNED)).accountStatus())
                .isEqualTo(AccountStatus.BANNED);
    }

    @Test void cannotMutateSelfAdminTargetTerminalAccountOrNullStatus() {
        when(access.requireAdmin(1L)).thenReturn(admin);

        when(users.findLockedById(1L)).thenReturn(Optional.of(admin));
        assertInvalid(1L, AccountStatus.SUSPENDED, ModerationException.Code.FORBIDDEN);

        User otherAdmin = user(3L, UserRole.ADMIN, AccountStatus.ACTIVE);
        when(users.findLockedById(3L)).thenReturn(Optional.of(otherAdmin));
        assertInvalid(3L, AccountStatus.SUSPENDED, ModerationException.Code.FORBIDDEN);

        target.updateAccountStatus(AccountStatus.BANNED);
        when(users.findLockedById(2L)).thenReturn(Optional.of(target));
        assertInvalid(2L, AccountStatus.ACTIVE, ModerationException.Code.INVALID_ACCOUNT_TRANSITION);

        target.updateAccountStatus(AccountStatus.ACTIVE);
        assertInvalid(2L, null, ModerationException.Code.INVALID_ACCOUNT_TRANSITION);
    }

    private void assertInvalid(long userId, AccountStatus status, ModerationException.Code code) {
        assertThatThrownBy(() -> service.updateStatus(1L, userId, new UserStatusUpdateRequest(status)))
                .isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode()).isEqualTo(code);
    }
}
