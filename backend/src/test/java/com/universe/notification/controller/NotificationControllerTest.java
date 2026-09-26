package com.universe.notification.controller;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.global.exception.GlobalExceptionHandler;
import com.universe.notification.dto.response.NotificationResponse;
import com.universe.notification.dto.response.UnreadCountResponse;
import com.universe.notification.entity.NotificationType;
import com.universe.notification.service.NotificationService;
import com.universe.report.service.ReportCurrentUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NotificationController.class)
@ContextConfiguration(classes = {NotificationController.class, ReportCurrentUser.class, GlobalExceptionHandler.class,
        NotificationControllerTest.SecurityContract.class})
class NotificationControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean NotificationService service;

    @TestConfiguration(proxyBeanMethods = false)
    static class SecurityContract {
        @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
            return http.csrf(c -> c.disable()).authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .exceptionHandling(errors -> errors.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))).build();
        }
    }

    @Test void listUsesAuthenticatedIdentityAndNewestFirst() throws Exception {
        var item = new NotificationResponse(1L, NotificationType.COMMENT, "content", 7L, false, LocalDateTime.now(), null);
        when(service.getMyNotifications(eq(42L), any())).thenAnswer(c -> new PageImpl<>(List.of(item), c.getArgument(1), 1));
        mvc.perform(get("/api/v1/notifications").with(user("42")).param("userId", "999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.content[0].type").value("COMMENT"))
                .andExpect(jsonPath("$.data.content[0].isRead").value(false)).andExpect(jsonPath("$.data.size").value(20));
        verify(service).getMyNotifications(42L, PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    }

    @Test void unreadCountAndReadActions() throws Exception {
        when(service.getUnreadCount(42L)).thenReturn(new UnreadCountResponse(3));
        when(service.markAllAsRead(42L)).thenReturn(new UnreadCountResponse(0));
        mvc.perform(get("/api/v1/notifications/unread-count").with(user("42")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.unreadCount").value(3));
        mvc.perform(patch("/api/v1/notifications/read-all").with(user("42")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.unreadCount").value(0));
        mvc.perform(patch("/api/v1/notifications/5/read").with(user("42"))).andExpect(status().isOk());
        mvc.perform(delete("/api/v1/notifications/5").with(user("42"))).andExpect(status().isOk());
        verify(service).markAsRead(42L, 5L);
        verify(service).delete(42L, 5L);
    }

    @Test void otherUsersNotificationIsNotFound() throws Exception {
        when(service.markAsRead(42L, 5L)).thenThrow(new BusinessException(ErrorCode.NOTIFICATION_NOT_FOUND));
        mvc.perform(patch("/api/v1/notifications/5/read").with(user("42")))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOTIFICATION_NOT_FOUND"));
    }

    @Test void anonymousRequestIsRejected() throws Exception {
        mvc.perform(get("/api/v1/notifications/unread-count")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
}
