package com.universe.report.controller;

import com.universe.global.common.ApiResponse;
import com.universe.report.dto.request.ReportCreateRequest;
import com.universe.report.dto.response.ReportDetailResponse;
import com.universe.report.dto.response.ReportResponse;
import com.universe.report.entity.ReportStatus;
import com.universe.report.entity.ReportType;
import com.universe.report.service.*;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.ResponseEntity;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReportController.class)
@ContextConfiguration(classes = {ReportController.class, ReportCurrentUser.class,
        ReportControllerTest.SecurityContract.class, ReportControllerTest.ExceptionContract.class})
class ReportControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean ReportService reports;

    private final ReportResponse response = new ReportResponse(7L, 2L, null, 3L, null,
            ReportType.SCAM, ReportStatus.PENDING, LocalDateTime.of(2026, 9, 23, 12, 0), null);

    // Simulates a security chain AFTER authentication. No JWT parser, issuer or fake production login.
    @TestConfiguration(proxyBeanMethods = false)
    static class SecurityContract {
        @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
            return http.authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .exceptionHandling(errors -> errors.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                    .build();
        }
    }

    // Test-only stand-in for the missing team's GlobalExceptionHandler.
    @RestControllerAdvice(assignableTypes = ReportController.class)
    static class ExceptionContract {
        @ExceptionHandler(ModerationException.class)
        ResponseEntity<ApiResponse<Void>> moderation(ModerationException exception) {
            HttpStatus status = switch (exception.getCode()) {
                case FORBIDDEN -> HttpStatus.FORBIDDEN;
                case REPORT_NOT_FOUND, USER_NOT_FOUND, REFERENCE_NOT_FOUND -> HttpStatus.NOT_FOUND;
                default -> HttpStatus.BAD_REQUEST;
            };
            return ResponseEntity.status(status).body(ApiResponse.failure(exception.getCode().name(), "Request rejected"));
        }
        @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
        ResponseEntity<ApiResponse<Void>> authentication() {
            return ResponseEntity.status(401).body(ApiResponse.failure("UNAUTHORIZED", "Authentication required"));
        }
    }

    @Test void createsReportUsingSecurityIdentityInsteadOfClientIdentity() throws Exception {
        when(reports.create(eq(42L), any())).thenReturn(response);
        mvc.perform(post("/api/v1/reports").with(user("42")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("""
                    {"targetUserId":2,"itemId":3,"reportType":"SCAM","description":"Test report",
                     "reporterId":999,"userId":888,"currentUserId":777}
                    """))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reportId").value(7));
        var request = ArgumentCaptor.forClass(ReportCreateRequest.class);
        verify(reports).create(eq(42L), request.capture());
        assertThat(request.getValue().targetUserId()).isEqualTo(2L);
        assertThat(request.getValue().itemId()).isEqualTo(3L);
        assertThat(request.getValue().evidences()).isEmpty();
    }

    @Test void rejectsUnauthenticatedCreateAndReads() throws Exception {
        mvc.perform(post("/api/v1/reports").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/reports/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/reports/7")).andExpect(status().isUnauthorized());
        verifyNoInteractions(reports);
    }

    @Test void rejectsPrincipalThatDoesNotFollowUserIdContract() throws Exception {
        mvc.perform(get("/api/v1/reports/me").with(user("someone@example.com")))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(reports);
    }

    @Test void rejectsInvalidRequestBeforeCallingService() throws Exception {
        mvc.perform(post("/api/v1/reports").with(user("42")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("""
                    {"targetUserId":0,"reportType":"SCAM","description":" "}
                    """))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(reports);
    }

    @Test void rejectsUnknownReportType() throws Exception {
        mvc.perform(post("/api/v1/reports").with(user("42")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("""
                    {"targetUserId":2,"reportType":"UNKNOWN","description":"Test"}
                    """))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(reports);
    }

    @Test void listsOnlyAuthenticatedUsersReportsWithStatusAndPagination() throws Exception {
        when(reports.findMine(eq(42L), eq(ReportStatus.PENDING), any()))
                .thenAnswer(call -> new PageImpl<>(List.of(response), call.getArgument(2), 23));
        mvc.perform(get("/api/v1/reports/me").with(user("42"))
                .param("status", "PENDING").param("page", "1").param("size", "10").param("userId", "999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.content[0].reportId").value(7))
                .andExpect(jsonPath("$.data.page").value(1)).andExpect(jsonPath("$.data.totalElements").value(23));
        var paging = ArgumentCaptor.forClass(Pageable.class);
        verify(reports).findMine(eq(42L), eq(ReportStatus.PENDING), paging.capture());
        assertThat(paging.getValue().getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "createdAt", "id"));
    }

    @Test void usesDefaultPagingAndOptionalStatus() throws Exception {
        when(reports.findMine(eq(42L), isNull(), any())).thenAnswer(call -> Page.empty(call.getArgument(2)));
        mvc.perform(get("/api/v1/reports/me").with(user("42")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(20));
    }

    @Test void rejectsInvalidPaginationStatusAndPathId() throws Exception {
        for (String query : List.of("page=-1", "size=0", "size=101", "status=UNKNOWN")) {
            mvc.perform(get("/api/v1/reports/me?" + query).with(user("42"))).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/v1/reports/0").with(user("42"))).andExpect(status().isBadRequest());
        verifyNoInteractions(reports);
    }

    @Test void returnsDetailWithoutEntityOrAdminFields() throws Exception {
        when(reports.getMine(42L, 7L)).thenReturn(new ReportDetailResponse(response, "Test", List.of()));
        mvc.perform(get("/api/v1/reports/7").with(user("42")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.report.reportId").value(7))
                .andExpect(jsonPath("$.data.description").value("Test"))
                .andExpect(jsonPath("$.data.adminNote").doesNotExist());
        verify(reports).getMine(42L, 7L);
    }

    @Test void propagatesServiceOwnershipDenialToCommonExceptionContract() throws Exception {
        when(reports.getMine(42L, 7L)).thenThrow(new ModerationException(ModerationException.Code.FORBIDDEN));
        mvc.perform(get("/api/v1/reports/7").with(user("42")))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test void propagatesMissingReportToCommonExceptionContract() throws Exception {
        when(reports.getMine(42L, 7L)).thenThrow(new ModerationException(ModerationException.Code.REPORT_NOT_FOUND));
        mvc.perform(get("/api/v1/reports/7").with(user("42"))).andExpect(status().isNotFound());
    }
}
