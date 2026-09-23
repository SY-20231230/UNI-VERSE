package com.universe.admin.controller;

import com.universe.admin.dto.request.*;
import com.universe.admin.dto.response.*;
import com.universe.admin.service.AdminReportService;
import com.universe.global.common.ApiResponse;
import com.universe.report.dto.response.ReportResponse;
import com.universe.report.entity.*;
import com.universe.report.service.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminReportController.class)
@ContextConfiguration(classes = {AdminReportController.class, ReportCurrentUser.class,
        AdminReportControllerTest.SecurityContract.class, AdminReportControllerTest.ExceptionContract.class})
class AdminReportControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean AdminReportService reports;
    final ReportResponse report = new ReportResponse(7L, 2L, null, null, null, ReportType.SCAM, ReportStatus.PROCESSED, null, null);
    @TestConfiguration(proxyBeanMethods = false)
    static class SecurityContract {
        @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
            return http.authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .exceptionHandling(errors -> errors.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))).build();
        }
    }
    @RestControllerAdvice(assignableTypes = AdminReportController.class)
    static class ExceptionContract {
        @ExceptionHandler(ModerationException.class)
        ResponseEntity<ApiResponse<Void>> handle(ModerationException exception) {
            int status = exception.getCode() == ModerationException.Code.FORBIDDEN ? 403 : 409;
            return ResponseEntity.status(status).body(ApiResponse.failure(exception.getCode().name(), "Request rejected"));
        }
    }
    @Test void bindsAllSearchFiltersAndUsesSecurityIdentity() throws Exception {
        when(reports.search(eq(42L), any(), any())).thenAnswer(call -> Page.empty(call.getArgument(2)));
        mvc.perform(get("/api/v1/admin/reports").with(user("42"))
                .param("status", "PENDING").param("reportType", "SCAM").param("targetUserId", "2")
                .param("from", "2026-09-01T00:00:00").param("to", "2026-09-23T12:00:00")
                .param("page", "1").param("size", "10").param("sort", "createdAt,asc").param("adminId", "999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.page").value(1));
        var condition = ArgumentCaptor.forClass(AdminReportSearchCondition.class);
        var page = ArgumentCaptor.forClass(Pageable.class);
        verify(reports).search(eq(42L), condition.capture(), page.capture());
        assertThat(condition.getValue().targetUserId()).isEqualTo(2L);
        assertThat(condition.getValue().status()).isEqualTo(ReportStatus.PENDING);
        assertThat(condition.getValue().from().getDayOfMonth()).isEqualTo(1);
        assertThat(page.getValue().getSort()).isEqualTo(Sort.by("createdAt").ascending());
    }
    @Test void appliesSearchDefaults() throws Exception {
        when(reports.search(eq(42L), any(), any())).thenAnswer(call -> Page.empty(call.getArgument(2)));
        mvc.perform(get("/api/v1/admin/reports").with(user("42"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0)).andExpect(jsonPath("$.data.size").value(20));
    }
    @Test void rejectsInvalidFiltersAndReversedPeriod() throws Exception {
        for (String query : List.of("page=-1", "size=101", "targetUserId=0", "status=UNKNOWN", "sort=password,asc", "from=2026-09-24T00:00:00&to=2026-09-23T00:00:00")) {
            mvc.perform(get("/api/v1/admin/reports?" + query).with(user("42"))).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(reports);
    }
    @Test void detailIsReturnedFromAdminService() throws Exception {
        when(reports.getDetail(42L, 7L)).thenReturn(new AdminReportDetailResponse(report, 1L, "Test", null, null, null, null, List.of()));
        mvc.perform(get("/api/v1/admin/reports/7").with(user("42"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.report.reportId").value(7)).andExpect(jsonPath("$.data.reporterId").value(1));
    }
    @Test void approvesWithOptionalSanction() throws Exception {
        when(reports.approve(eq(42L), eq(7L), any())).thenReturn(new ReportProcessResponse(report, 30, null));
        mvc.perform(post("/api/v1/admin/reports/7/approve").with(user("42")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"adminNote\":\"confirmed\",\"sanctionType\":\"WARNING\",\"adminId\":999}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.trustScore").value(30));
        verify(reports).approve(42L, 7L, new ReportApproveRequest("confirmed", SanctionType.WARNING));
    }
    @Test void dismissUsesItsOwnRequestContract() throws Exception {
        when(reports.dismiss(eq(42L), eq(7L), any())).thenReturn(report);
        mvc.perform(post("/api/v1/admin/reports/7/dismiss").with(user("42")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"adminNote\":\"insufficient evidence\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.reportId").value(7));
        verify(reports).dismiss(42L, 7L, new ReportDismissRequest("insufficient evidence"));
    }
    @Test void invalidNotesAndSanctionsNeverReachService() throws Exception {
        for (String action : List.of("approve", "dismiss")) {
            mvc.perform(post("/api/v1/admin/reports/7/" + action).with(user("42")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"adminNote\":\" \"}")).andExpect(status().isBadRequest());
        }
        mvc.perform(post("/api/v1/admin/reports/7/approve").with(user("42")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"adminNote\":\"test\",\"sanctionType\":\"suspend_3\"}")).andExpect(status().isBadRequest());
        verifyNoInteractions(reports);
    }
    @Test void unauthenticatedRequestsAreRejected() throws Exception {
        mvc.perform(get("/api/v1/admin/reports")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/reports/7")).andExpect(status().isUnauthorized());
        for (String action : List.of("approve", "dismiss")) {
            mvc.perform(post("/api/v1/admin/reports/7/" + action).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"adminNote\":\"test\"}")).andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(reports);
    }
    @Test void serviceDenialAndAlreadyProcessedErrorsDoNotBecomeSuccess() throws Exception {
        when(reports.getDetail(42L, 7L)).thenThrow(new ModerationException(ModerationException.Code.FORBIDDEN));
        mvc.perform(get("/api/v1/admin/reports/7").with(user("42"))).andExpect(status().isForbidden());
        when(reports.approve(eq(42L), eq(7L), any())).thenThrow(new ModerationException(ModerationException.Code.REPORT_ALREADY_PROCESSED));
        mvc.perform(post("/api/v1/admin/reports/7/approve").with(user("42")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"adminNote\":\"test\"}")).andExpect(status().isConflict()).andExpect(jsonPath("$.success").value(false));
    }
}
