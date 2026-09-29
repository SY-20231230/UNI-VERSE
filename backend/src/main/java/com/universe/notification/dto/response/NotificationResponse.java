package com.universe.notification.dto.response;

import com.universe.notification.entity.Notification;
import com.universe.notification.entity.NotificationType;

import java.time.LocalDateTime;

public record NotificationResponse(Long notificationId, NotificationType type, String content, Long targetId,
        boolean isRead, LocalDateTime createdAt, LocalDateTime readAt) {

    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(n.getId(), n.getType(), n.getContent(), n.getTargetId(),
                Boolean.TRUE.equals(n.getIsRead()), n.getCreatedAt(), n.getReadAt());
    }
}
