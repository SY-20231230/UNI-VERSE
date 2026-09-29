package com.universe.community.controller;

import com.universe.community.dto.response.CommunityPostListResponse;
import com.universe.community.service.CommunityPostService;
import com.universe.global.common.PageResponse;
import com.universe.global.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CommunityPostController.class)
@ContextConfiguration(classes = {
        CommunityPostController.class,
        GlobalExceptionHandler.class,
        CommunityPostControllerTest.SecurityContract.class
})
class CommunityPostControllerTest {
    @Autowired
    MockMvc mvc;

    @MockitoBean
    CommunityPostService service;

    @TestConfiguration(proxyBeanMethods = false)
    static class SecurityContract {
        @Bean
        SecurityFilterChain chain(HttpSecurity http) throws Exception {
            return http.csrf(csrf -> csrf.disable())
                    .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .exceptionHandling(errors -> errors.authenticationEntryPoint(
                            new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                    .build();
        }
    }

    @Test
    void listResponseIncludesCommentCount() throws Exception {
        CommunityPostListResponse post = new CommunityPostListResponse(
                1L,
                "FREE",
                "댓글이 있는 게시글",
                "내용",
                false,
                7L,
                "작성자",
                10,
                1L,
                3L,
                LocalDateTime.of(2026, 9, 28, 12, 0),
                List.of("태그"));
        PageRequest pageable = PageRequest.of(0, 20);
        when(service.list(null, null, null, "latest", 0, 20))
                .thenReturn(new PageResponse<>(new PageImpl<>(List.of(post), pageable, 1)));

        mvc.perform(get("/api/v1/community/posts").with(user("42")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].postId").value(1))
                .andExpect(jsonPath("$.data.content[0].commentCount").value(3));

        verify(service).list(null, null, null, "latest", 0, 20);
    }
}
