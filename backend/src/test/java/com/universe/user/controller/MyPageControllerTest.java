package com.universe.user.controller;

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

import com.universe.user.service.MyPageService;
import com.universe.user.dto.response.MyPageResponse;
import com.universe.market.entity.TradeStatus;

@WebMvcTest(MyPageController.class)
@ContextConfiguration(classes = {MyPageController.class, ReportCurrentUser.class, GlobalExceptionHandler.class,
        MyPageControllerTest.SecurityContract.class})
class MyPageControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean MyPageService service;
    @TestConfiguration(proxyBeanMethods = false)
    static class SecurityContract {
        @Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
            return http.authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .exceptionHandling(errors -> errors.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))).build();
        }
    }

    @Test void summaryUsesAuthenticatedIdentityAndRealSharedResponse() throws Exception {
        when(service.getSummary(42L)).thenReturn(new MyPageResponse(42L, "a@test.example", "name", "nick", null, null, false, 50, 1, 2, 3));
        mvc.perform(get("/api/v1/mypage").with(user("42")).param("userId", "999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.userId").value(42))
                .andExpect(jsonPath("$.data.trustScore").value(50)).andExpect(jsonPath("$.code").value("SUCCESS"));
        verify(service).getSummary(42L);
    }
    @Test void pagedReadsUseCsvPathsAndBoundedDefaults() throws Exception {
        when(service.findPosts(eq(42L), any())).thenAnswer(c -> Page.empty(c.getArgument(1)));
        when(service.findItems(eq(42L), eq(TradeStatus.SELLING), any())).thenAnswer(c -> Page.empty(c.getArgument(2)));
        when(service.findTrustHistory(eq(42L), any())).thenAnswer(c -> Page.empty(c.getArgument(1)));
        mvc.perform(get("/api/v1/mypage/posts").with(user("42"))).andExpect(status().isOk()).andExpect(jsonPath("$.data.size").value(20));
        mvc.perform(get("/api/v1/mypage/market-items").with(user("42")).param("tradeStatus", "SELLING").param("page", "1").param("size", "5"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.page").value(1));
        mvc.perform(get("/api/v1/mypage/trust-history").with(user("42"))).andExpect(status().isOk());
        verify(service).findItems(42L, TradeStatus.SELLING, PageRequest.of(1, 5, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    }
    @Test void sharedHandlerReturnsForbiddenForInactiveUser() throws Exception {
        when(service.getSummary(42L)).thenThrow(new ModerationException(ModerationException.Code.FORBIDDEN));
        mvc.perform(get("/api/v1/mypage").with(user("42"))).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false)).andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }
    @Test void anonymousAndInvalidPrincipalCannotReachService() throws Exception {
        for (String path : new String[]{"", "/posts", "/market-items", "/trust-history"}) {
            mvc.perform(get("/api/v1/mypage" + path)).andExpect(status().isUnauthorized());
        }
        mvc.perform(get("/api/v1/mypage").with(user("not-an-id"))).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        verifyNoInteractions(service);
    }
}
