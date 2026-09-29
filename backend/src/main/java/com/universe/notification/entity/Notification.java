package com.universe.notification.entity;

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
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notifications_receiver_created", columnList = "receiver_id, created_at"),
        @Index(name = "idx_notifications_receiver_read", columnList = "receiver_id, is_read")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false, length = 255)
    private String content;

    /** 알림 클릭 시 이동할 대상의 ID (게시글·상품·신고·채팅 등, 대상은 type 으로 구분) */
    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Builder
    public Notification(User receiver, NotificationType type, String content, Long targetId) {
        this.receiver = receiver;
        this.type = type;
        this.content = content;
        this.targetId = targetId;
        this.isRead = false;
    }

    public void markAsRead() {
        if (Boolean.TRUE.equals(isRead)) return;
        this.isRead = true;
        this.readAt = LocalDateTime.now();
    }
}
