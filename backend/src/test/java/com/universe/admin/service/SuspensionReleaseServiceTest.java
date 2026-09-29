package com.universe.admin.service;

import com.universe.report.entity.*;
import com.universe.report.repository.*;
import com.universe.trust.service.TrustScoreService;
import com.universe.user.entity.*;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SuspensionReleaseServiceTest {
    @Mock ModerationUserRepository users;
    @Mock UserSanctionRepository sanctions;
    @Mock TrustScoreService trust;
    @InjectMocks SuspensionReleaseService service;
    LocalDateTime now;
    User user;

    @BeforeEach void setup() {
        now = LocalDateTime.of(2026, 9, 28, 9, 0);
        user = User.builder().email("user@test.example").password("test").name("user").nickname("user").build();
        ReflectionTestUtils.setField(user, "id", 42L);
        user.updateAccountStatus(AccountStatus.SUSPENDED);
    }

    private UserSanction suspension(LocalDateTime endAt) {
        UserSanction sanction = UserSanction.builder().user(user).sanctionType(SanctionType.SUSPENSION)
                .reason("temporary").startAt(now.minusDays(3)).endAt(endAt).build();
        ReflectionTestUtils.setField(sanction, "id", 10L);
        return sanction;
    }

    @Test void missingOrNonSuspendedUserIsNotReleased() {
        when(users.findLockedById(42L)).thenReturn(Optional.empty());
        assertThat(service.releaseIfExpired(42L, now)).isFalse();

        user.updateAccountStatus(AccountStatus.ACTIVE);
        when(users.findLockedById(42L)).thenReturn(Optional.of(user));
        assertThat(service.releaseIfExpired(42L, now)).isFalse();
        verifyNoInteractions(sanctions, trust);
    }

    @Test void activeBanOrSuspensionPreventsRelease() {
        when(users.findLockedById(42L)).thenReturn(Optional.of(user));
        when(sanctions.hasActive(42L, SanctionType.BAN, now)).thenReturn(true);
        assertThat(service.releaseIfExpired(42L, now)).isFalse();

        when(sanctions.hasActive(42L, SanctionType.BAN, now)).thenReturn(false);
        when(sanctions.hasActive(42L, SanctionType.SUSPENSION, now)).thenReturn(true);
        assertThat(service.releaseIfExpired(42L, now)).isFalse();
        verifyNoInteractions(trust);
    }

    @Test void missingNullOrFutureLatestSuspensionIsNotReleased() {
        when(users.findLockedById(42L)).thenReturn(Optional.of(user));
        when(sanctions.findFirstByUserIdAndSanctionTypeOrderByStartAtDescIdDesc(42L, SanctionType.SUSPENSION))
                .thenReturn(Optional.empty(), Optional.of(suspension(null)), Optional.of(suspension(now.plusSeconds(1))));

        assertThat(service.releaseIfExpired(42L, now)).isFalse();
        assertThat(service.releaseIfExpired(42L, now)).isFalse();
        assertThat(service.releaseIfExpired(42L, now)).isFalse();
        verifyNoInteractions(trust);
    }

    @Test void expiredSuspensionReactivatesAndResetsTrustExactlyOnce() {
        UserSanction ended = suspension(now.minusSeconds(1));
        when(users.findLockedById(42L)).thenReturn(Optional.of(user));
        when(sanctions.findFirstByUserIdAndSanctionTypeOrderByStartAtDescIdDesc(42L, SanctionType.SUSPENSION))
                .thenReturn(Optional.of(ended));

        assertThat(service.releaseIfExpired(42L, now)).isTrue();

        assertThat(user.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        verify(trust).releaseSuspension(ended, now);
    }
}
