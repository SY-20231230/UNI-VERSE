package com.universe.admin.controller;

import com.universe.admin.service.AdminSessionActivityService;
import com.universe.report.service.ReportCurrentUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminSessionActivityController.class)
@ContextConfiguration(classes = {AdminSessionActivityController.class, ReportCurrentUser.class,
        AdminSessionActivityControllerTest.SecurityContract.class})
class AdminSessionActivityControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean AdminSessionActivityService activities;

    @TestConfiguration(proxyBeanMethods = false)
    static class SecurityContract {
        @Bean
        SecurityFilterChain chain(HttpSecurity http) throws Exception {
            return http.authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .exceptionHandling(errors -> errors.authenticationEntryPoint(
                            new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                    .build();
        }
    }

    @Test
    void authenticatedAdminGetsCsvDownloadResponse() throws Exception {
        byte[] csv = "\uFEFFuserId,email\r\n".getBytes(StandardCharsets.UTF_8);
        when(activities.exportCsv(eq(42L), any())).thenReturn(csv);

        mvc.perform(get("/api/v1/admin/session-activities/export").with(user("42")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"session-activity.csv\""))
                .andExpect(content().contentType(MediaType.parseMediaType("text/csv; charset=UTF-8")))
                .andExpect(content().bytes(csv));

        verify(activities).exportCsv(eq(42L), any());
    }

    @Test
    void unauthenticatedDownloadIsRejected() throws Exception {
        mvc.perform(get("/api/v1/admin/session-activities/export"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(activities);
    }
}