package com.universe.notification.controller;

import com.universe.global.common.ApiResponse;
import com.universe.global.common.PageResponse;
import com.universe.notification.dto.response.NotificationResponse;
import com.universe.notification.dto.response.UnreadCountResponse;
import com.universe.notification.service.NotificationService;
import com.universe.report.service.ReportCurrentUser;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notifications;
    private final ReportCurrentUser currentUser;

    @GetMapping
    public ApiResponse<PageResponse<NotificationResponse>> findMine(Authentication authentication,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(new PageResponse<>(notifications.getMyNotifications(currentUser.requireId(authentication),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")))));
    }

    @GetMapping("/unread-count")
    public ApiResponse<UnreadCountResponse> unreadCount(Authentication authentication) {
        return ApiResponse.success(notifications.getUnreadCount(currentUser.requireId(authentication)));
    }

    @PatchMapping("/{notificationId}/read")
    public ApiResponse<NotificationResponse> markAsRead(Authentication authentication, @PathVariable Long notificationId) {
        return ApiResponse.success(notifications.markAsRead(currentUser.requireId(authentication), notificationId));
    }

    @PatchMapping("/read-all")
    public ApiResponse<UnreadCountResponse> markAllAsRead(Authentication authentication) {
        return ApiResponse.success(notifications.markAllAsRead(currentUser.requireId(authentication)));
    }

    @DeleteMapping("/{notificationId}")
    public ApiResponse<Void> delete(Authentication authentication, @PathVariable Long notificationId) {
        notifications.delete(currentUser.requireId(authentication), notificationId);
        return ApiResponse.success();
    }
}
