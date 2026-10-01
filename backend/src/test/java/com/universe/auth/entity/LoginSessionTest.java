package com.universe.auth.entity;

import com.universe.user.entity.User;
import java.time.Duration;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class LoginSessionTest {

    @Test
    void activityAtThirtyMinuteBoundaryEndsSessionAtIdleDeadline() {
        Long userId = 7L;
        LocalDateTime loginAt = LocalDateTime.of(2026, 10, 1, 9, 0);
        LoginSession session = new LoginSession("session-id", user(userId), loginAt);

        assertThat(session.recordActivity(userId, loginAt.plusMinutes(10), Duration.ofMinutes(30))).isTrue();
        assertThat(session.recordActivity(userId, loginAt.plusMinutes(40), Duration.ofMinutes(30))).isFalse();

        assertThat(session.getLastActivityAt()).isEqualTo(loginAt.plusMinutes(10));
        assertThat(session.getEndedAt()).isEqualTo(loginAt.plusMinutes(40));
        assertThat(session.getEndReason()).isEqualTo(LoginSession.EndReason.INACTIVITY_TIMEOUT);
    }

    @Test
    void endedSessionDoesNotAcceptFurtherActivity() {
        Long userId = 7L;
        LocalDateTime loginAt = LocalDateTime.of(2026, 10, 1, 9, 0);
        LoginSession session = new LoginSession("session-id", user(userId), loginAt);
        LocalDateTime logoutAt = loginAt.plusMinutes(4);
        session.end(LoginSession.EndReason.LOGOUT, logoutAt);

        assertThat(session.recordActivity(userId, logoutAt.plusMinutes(1), Duration.ofMinutes(30))).isFalse();
        assertThat(session.getEndedAt()).isEqualTo(logoutAt);
        assertThat(session.getEndReason()).isEqualTo(LoginSession.EndReason.LOGOUT);
    }

    private static User user(Long id) {
        User user = User.builder().email("test@example.ac.kr").password("encoded")
                .name("Test").nickname("Test").build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }
}