package com.universe.admin.service;

import com.universe.auth.entity.LoginSession;
import com.universe.auth.service.LoginSessionService;
import com.universe.auth.repository.LoginSessionRepository;
import com.universe.report.service.ModerationAccessService;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminSessionActivityService {
    private final ModerationAccessService access;
    private final LoginSessionRepository sessions;
    private final LoginSessionService sessionService;

    @Transactional
    public byte[] exportCsv(Long authenticatedAdminId, LocalDateTime now) {
        access.requireAdmin(authenticatedAdminId);
        sessionService.expireInactive(now);

        StringBuilder csv = new StringBuilder("\uFEFF");
        csv.append("사용자 ID,이메일,닉네임,로그인 시각,마지막 API 요청 시각,종료 시각,체류시간(초),종료 사유\r\n");
        List<LoginSession> records = sessions.findAllByOrderByLoginAtDescIdDesc();
        for (LoginSession record : records) {
            LocalDateTime end = record.getEndedAt() == null ? now : record.getEndedAt();
            long durationSeconds = Math.max(0, Duration.between(record.getLoginAt(), end).getSeconds());
            csv.append(record.getUser().getId()).append(',')
                    .append(cell(record.getUser().getEmail())).append(',')
                    .append(cell(record.getUser().getNickname())).append(',')
                    .append(cell(format(record.getLoginAt()))).append(',')
                    .append(cell(format(record.getLastActivityAt()))).append(',')
                    .append(cell(format(record.getEndedAt()))).append(',')
                    .append(durationSeconds).append(',')
                    .append(cell(reason(record))).append("\r\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String reason(LoginSession session) {
        if (session.getEndReason() == null) return "진행 중";
        return switch (session.getEndReason()) {
            case LOGOUT -> "로그아웃";
            case INACTIVITY_TIMEOUT -> "30분 미활동 만료";
        };
    }

    private static String format(LocalDateTime value) {
        return value == null ? "" : value.toString().replace('T', ' ');
    }

    private static String cell(String value) {
        String content = value == null ? "" : value;
        String trimmed = content.stripLeading();
        if (!trimmed.isEmpty() && "=+-@".indexOf(trimmed.charAt(0)) >= 0) content = "'" + content;
        return "\"" + content.replace("\"", "\"\"") + "\"";
    }
}