package com.universe.notification.service;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.notification.dto.response.NotificationResponse;
import com.universe.notification.dto.response.UnreadCountResponse;
import com.universe.notification.entity.Notification;
import com.universe.notification.entity.NotificationType;
import com.universe.notification.repository.NotificationRepository;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    static final int CONTENT_MAX_LENGTH = 255;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public Page<NotificationResponse> getMyNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByReceiverId(userId, pageable).map(NotificationResponse::from);
    }

    public UnreadCountResponse getUnreadCount(Long userId) {
        return new UnreadCountResponse(notificationRepository.countByReceiverIdAndIsReadFalse(userId));
    }

    @Transactional
    public NotificationResponse markAsRead(Long userId, Long notificationId) {
        Notification notification = findOwned(userId, notificationId);
        notification.markAsRead();
        return NotificationResponse.from(notification);
    }

    @Transactional
    public UnreadCountResponse markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId, LocalDateTime.now());
        return new UnreadCountResponse(0);
    }

    @Transactional
    public void delete(Long userId, Long notificationId) {
        notificationRepository.delete(findOwned(userId, notificationId));
    }

    /**
     * 이벤트 리스너 전용. 원 트랜잭션 커밋 이후 호출되므로 반드시 새 트랜잭션에서 저장한다.
     * 탈퇴 등으로 수신자가 없으면 조용히 건너뛴다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void send(Long receiverId, NotificationType type, String content, Long targetId) {
        if (receiverId == null) return;
        userRepository.findById(receiverId)
                .ifPresent(receiver -> notificationRepository.save(build(receiver, type, content, targetId)));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendAll(Collection<Long> receiverIds, NotificationType type, String content, Long targetId) {
        if (receiverIds.isEmpty()) return;
        var receivers = userRepository.findAllById(receiverIds.stream().filter(Objects::nonNull).distinct().toList());
        notificationRepository.saveAll(receivers.stream().map(r -> build(r, type, content, targetId)).toList());
    }

    private Notification build(User receiver, NotificationType type, String content, Long targetId) {
        String trimmed = content.length() > CONTENT_MAX_LENGTH ? content.substring(0, CONTENT_MAX_LENGTH) : content;
        return Notification.builder().receiver(receiver).type(type).content(trimmed).targetId(targetId).build();
    }

    private Notification findOwned(Long userId, Long notificationId) {
        // 다른 사람의 알림은 존재 여부도 노출하지 않도록 NOT_FOUND 로 통일한다.
        return notificationRepository.findByIdAndReceiverId(notificationId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOTIFICATION_NOT_FOUND));
    }
}
