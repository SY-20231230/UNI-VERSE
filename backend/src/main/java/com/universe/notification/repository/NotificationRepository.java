package com.universe.notification.repository;

import com.universe.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByReceiverId(Long receiverId, Pageable pageable);

    Optional<Notification> findByIdAndReceiverId(Long id, Long receiverId);

    long countByReceiverIdAndIsReadFalse(Long receiverId);

    @Modifying(clearAutomatically = true)
    @Query("update Notification n set n.isRead = true, n.readAt = :now where n.receiver.id = :receiverId and n.isRead = false")
    int markAllAsRead(@Param("receiverId") Long receiverId, @Param("now") LocalDateTime now);
}
