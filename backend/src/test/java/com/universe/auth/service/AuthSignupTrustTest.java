package com.universe.auth.service;

import com.universe.auth.dto.request.SignupRequest;
import com.universe.global.security.JwtTokenProvider;
import com.universe.global.security.TokenSessionService;
import com.universe.trust.repository.TrustHistoryRepository;
import com.universe.trust.service.TrustScorePolicy;
import com.universe.trust.service.TrustScoreService;
import com.universe.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false",
        "spring.sql.init.mode=never", "spring.flyway.enabled=false", "spring.liquibase.enabled=false"})
@Import({AuthService.class, TrustScoreService.class, TrustScorePolicy.class, AuthSignupTrustTest.Config.class})
class AuthSignupTrustTest {
    @Autowired AuthService auth;
    @Autowired UserRepository users;
    @Autowired TrustHistoryRepository histories;
    @Autowired EntityManager em;
    @MockitoBean JwtTokenProvider jwt;
    @MockitoBean TokenSessionService sessions;

    static class Config {
        @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    }

    @Test void newMemberStartsWithDefaultTrustScoreAndHistory() {
        var request = new SignupRequest();
        ReflectionTestUtils.setField(request, "email", "new@test.example");
        ReflectionTestUtils.setField(request, "password", "password1");
        ReflectionTestUtils.setField(request, "name", "name");
        ReflectionTestUtils.setField(request, "nickname", "nick");

        Long userId = auth.signup(request).getUserId();
        em.flush(); em.clear();

        assertThat(users.findById(userId).orElseThrow().getTrustScore()).isEqualTo(50);
        assertThat(histories.existsByUserId(userId)).isTrue();
    }
}
