package com.universe.auth.entity;

import com.universe.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "login_sessions", indexes = {
        @Index(name = "idx_login_sessions_user_login", columnList = "user_id, login_at"),
        @Index(name = "idx_login_sessions_active_activity", columnList = "ended_at, last_activity_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LoginSession {

    @Id
    @Column(name = "session_id", length = 36, nullable = false, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "login_at", nullable = false)
    private LocalDateTime loginAt;

    @Column(name = "last_activity_at", nullable = false)
    private LocalDateTime lastActivityAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "end_reason", length = 32)
    private EndReason endReason;

    public LoginSession(String id, User user, LocalDateTime loginAt) {
        this.id = id;
        this.user = user;
        this.loginAt = loginAt;
        this.lastActivityAt = loginAt;
    }

    public boolean recordActivity(Long userId, LocalDateTime at, Duration idleTimeout) {
        if (endedAt != null || !user.getId().equals(userId)) return false;
        if (!at.isBefore(lastActivityAt.plus(idleTimeout))) {
            end(EndReason.INACTIVITY_TIMEOUT, lastActivityAt.plus(idleTimeout));
            return false;
        }
        if (at.isAfter(lastActivityAt)) lastActivityAt = at;
        return true;
    }

    public void end(EndReason reason, LocalDateTime at) {
        if (endedAt != null) return;
        endedAt = at;
        endReason = reason;
    }

    public enum EndReason {
        LOGOUT,
        INACTIVITY_TIMEOUT
    }
}