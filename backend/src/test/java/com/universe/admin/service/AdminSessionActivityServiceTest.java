package com.universe.admin.service;

import com.universe.auth.entity.LoginSession;
import com.universe.auth.repository.LoginSessionRepository;
import com.universe.auth.service.LoginSessionService;
import com.universe.report.service.ModerationAccessService;
import com.universe.user.entity.User;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminSessionActivityServiceTest {
    @Mock ModerationAccessService access;
    @Mock LoginSessionRepository sessions;
    @Mock LoginSessionService sessionService;
    @InjectMocks AdminSessionActivityService service;

    @Test
    void exportIncludesSessionDurationAndPreventsSpreadsheetFormulaExecution() {
        Long userId = 7L;
        LocalDateTime loginAt = LocalDateTime.of(2026, 10, 1, 9, 0);
        LocalDateTime lastActivityAt = loginAt.plusMinutes(5);
        LocalDateTime logoutAt = loginAt.plusMinutes(12);
        User user = User.builder().email("=HYPERLINK(\"https://example.test\")").password("encoded")
                .name("Test").nickname("Member, One").build();
        ReflectionTestUtils.setField(user, "id", userId);
        LoginSession session = new LoginSession("session-id", user, loginAt);
        session.recordActivity(userId, lastActivityAt, LoginSessionService.IDLE_TIMEOUT);
        session.end(LoginSession.EndReason.LOGOUT, logoutAt);
        when(sessions.findAllByOrderByLoginAtDescIdDesc()).thenReturn(List.of(session));

        String csv = new String(service.exportCsv(1L, logoutAt.plusMinutes(1)), StandardCharsets.UTF_8);

        assertThat(csv).startsWith("\uFEFF사용자 ID,이메일,닉네임");
        assertThat(csv).contains("7,\"'=HYPERLINK(\"\"https://example.test\"\")\",\"Member, One\"");
        assertThat(csv).contains(",720,\"로그아웃\"");
        verify(access).requireAdmin(1L);
        verify(sessionService).expireInactive(logoutAt.plusMinutes(1));
    }
}