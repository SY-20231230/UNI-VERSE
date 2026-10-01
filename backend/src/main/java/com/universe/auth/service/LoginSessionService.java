package com.universe.auth.service;

import com.universe.file.service.FileService;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.Getter;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LoginSessionService {
    public static final Duration IDLE_TIMEOUT = Duration.ofMinutes(30);

    private final UserRepository users;
    private final FileService fileService;
    
    private final Map<String, SessionData> activeSessions = new ConcurrentHashMap<>();

    public enum EndReason {
        LOGOUT,
        INACTIVITY_TIMEOUT
    }

    @Getter
    public static class SessionData {
        private final Long userId;
        private final String email;
        private final String nickname;
        private final LocalDateTime loginAt;
        private LocalDateTime lastActivityAt;

        public SessionData(User user, LocalDateTime loginAt) {
            this.userId = user.getId();
            this.email = user.getEmail();
            this.nickname = user.getNickname();
            this.loginAt = loginAt;
            this.lastActivityAt = loginAt;
        }

        public void updateActivity(LocalDateTime now) {
            if (now.isAfter(this.lastActivityAt)) {
                this.lastActivityAt = now;
            }
        }
    }

    public String start(Long userId, LocalDateTime now) {
        User user = users.findById(userId).orElseThrow();
        String sessionId = UUID.randomUUID().toString();
        activeSessions.put(sessionId, new SessionData(user, now));
        return sessionId;
    }

    public boolean recordActivity(String sessionId, Long userId, LocalDateTime now) {
        if (sessionId == null || sessionId.isBlank()) return false;
        SessionData data = activeSessions.get(sessionId);
        if (data == null || !data.getUserId().equals(userId)) return false;
        
        if (!now.isBefore(data.getLastActivityAt().plus(IDLE_TIMEOUT))) {
            end(sessionId, userId, EndReason.INACTIVITY_TIMEOUT, data.getLastActivityAt().plus(IDLE_TIMEOUT));
            return false;
        }
        data.updateActivity(now);
        return true;
    }

    public void end(String sessionId, Long userId, EndReason reason, LocalDateTime now) {
        if (sessionId == null || sessionId.isBlank()) return;
        SessionData data = activeSessions.get(sessionId);
        if (data != null && data.getUserId().equals(userId)) {
            activeSessions.remove(sessionId);
            logSession(sessionId, data, reason, now);
        }
    }

    public void endAll(Long userId, EndReason reason, LocalDateTime now) {
        activeSessions.entrySet().removeIf(entry -> {
            if (entry.getValue().getUserId().equals(userId)) {
                logSession(entry.getKey(), entry.getValue(), reason, now);
                return true;
            }
            return false;
        });
    }

    public int expireInactive(LocalDateTime now) {
        LocalDateTime cutoff = now.minus(IDLE_TIMEOUT);
        int[] count = {0};
        activeSessions.entrySet().removeIf(entry -> {
            SessionData data = entry.getValue();
            if (data.getLastActivityAt().isBefore(cutoff)) {
                logSession(entry.getKey(), data, EndReason.INACTIVITY_TIMEOUT, data.getLastActivityAt().plus(IDLE_TIMEOUT));
                count[0]++;
                return true;
            }
            return false;
        });
        return count[0];
    }
    
    private void logSession(String sessionId, SessionData data, EndReason reason, LocalDateTime end) {
        long durationSeconds = Math.max(0, Duration.between(data.getLoginAt(), end).getSeconds());
        String reasonStr = reason == EndReason.LOGOUT ? "로그아웃" : "30분 미활동 만료";
        String csvLine = String.format("%d,%s,%s,%s,%s,%s,%d,%s",
                data.getUserId(), cell(data.getEmail()), cell(data.getNickname()),
                format(data.getLoginAt()), format(data.getLastActivityAt()), format(end),
                durationSeconds, cell(reasonStr));
        fileService.saveSessionLog(sessionId, csvLine);
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