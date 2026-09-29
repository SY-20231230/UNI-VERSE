package com.universe.report.entity;

import com.universe.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_sanctions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class UserSanction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sanction_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private User admin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id")
    private Report report;

    @Enumerated(EnumType.STRING)
    @Column(name = "sanction_type", nullable = false, length = 30)
    private SanctionType sanctionType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at")
    private LocalDateTime endAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public UserSanction(User user, User admin, Report report, SanctionType sanctionType, String reason, LocalDateTime startAt, LocalDateTime endAt) {
        this.user = user;
        this.admin = admin;
        this.report = report;
        this.sanctionType = sanctionType;
        this.reason = reason;
        this.startAt = startAt != null ? startAt : LocalDateTime.now();
        this.endAt = endAt;
    }
}
