package com.universe.admin.controller;

import org.junit.jupiter.api.Test;
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
import com.universe.global.exception.GlobalExceptionHandler;
import com.universe.report.service.ReportCurrentUser;
import com.universe.report.service.ModerationException;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.universe.admin.dto.request.*;
import com.universe.admin.service.AdminUserService;
import com.universe.admin.service.AdminSanctionService;
import com.universe.user.entity.AccountStatus;
import com.universe.report.entity.SanctionType;
import java.util.List;

@WebMvcTest(AdminUserController.class)
@ContextConfiguration(classes = {AdminUserController.class, ReportCurrentUser.class, GlobalExceptionHandler.class,
        AdminUserControllerTest.SecurityContract.class})
class AdminUserControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean AdminUserService users;
    @MockitoBean AdminSanctionService sanctions;
    @TestConfiguration(proxyBeanMethods = false)
    static class SecurityContract {
        @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
            return http.authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .exceptionHandling(errors -> errors.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))).build();
        }
    }

    @Test void bindsCsvSearchFiltersAndIgnoresClientAdminId() throws Exception {
        when(users.search(eq(42L), any(), any())).thenAnswer(c -> Page.empty(c.getArgument(2)));
        mvc.perform(get("/api/v1/admin/users").with(user("42")).param("keyword", "alice")
                .param("accountStatus", "ACTIVE").param("schoolId", "3").param("adminId", "999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(0));
        verify(users).search(eq(42L), eq(new AdminUserSearchCondition("alice", AccountStatus.ACTIVE, 3L)),
                eq(PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt", "id"))));
    }
    @Test void detailAndSanctionsUsePathTargetAndAuthenticatedAdmin() throws Exception {
        when(users.findSanctions(eq(42L), eq(7L), any())).thenAnswer(c -> Page.empty(c.getArgument(2)));
        mvc.perform(get("/api/v1/admin/users/7").with(user("42"))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/users/7/sanctions").with(user("42"))).andExpect(status().isOk());
        verify(users).getDetail(42L, 7L);
        verify(users).findSanctions(eq(42L), eq(7L), any());
    }
    @Test void mutationsUseCsvMethodsAndValidatedRequests() throws Exception {
        mvc.perform(post("/api/v1/admin/users/7/sanctions").with(user("42")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"sanctionType\":\"WARNING\",\"reason\":\"reviewed\",\"adminId\":999}"))
                .andExpect(status().isCreated());
        verify(sanctions).create(42L, 7L, new UserSanctionCreateRequest(SanctionType.WARNING, "reviewed", null, null));
        mvc.perform(patch("/api/v1/admin/users/7/status").with(user("42")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"accountStatus\":\"ACTIVE\"}")).andExpect(status().isOk());
        verify(users).updateStatus(42L, 7L, new UserStatusUpdateRequest(AccountStatus.ACTIVE));
    }
    @Test void invalidBodiesAreRejectedByRealSharedHandler() throws Exception {
        mvc.perform(post("/api/v1/admin/users/7/sanctions").with(user("42")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\" \"}")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        mvc.perform(patch("/api/v1/admin/users/7/status").with(user("42")).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isBadRequest());
        verifyNoInteractions(users, sanctions);
    }
    @Test void sharedHandlerMapsDomainFailuresInsteadOfInternalServerError() throws Exception {
        when(users.getDetail(42L, 7L)).thenThrow(new ModerationException(ModerationException.Code.USER_NOT_FOUND));
        mvc.perform(get("/api/v1/admin/users/7").with(user("42"))).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("USER_NOT_FOUND"));
        when(users.search(eq(42L), any(), any())).thenThrow(new ModerationException(ModerationException.Code.FORBIDDEN));
        mvc.perform(get("/api/v1/admin/users").with(user("42"))).andExpect(status().isForbidden());
    }
    @Test void anonymousCannotReadOrMutate() throws Exception {
        for (String path : List.of("", "/7", "/7/sanctions"))
            mvc.perform(get("/api/v1/admin/users" + path)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/admin/users/7/sanctions").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/v1/admin/users/7/status").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(users, sanctions);
    }
}
