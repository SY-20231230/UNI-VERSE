package com.universe.auth.service;

import com.universe.auth.dto.request.SignupRequest;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.global.security.JwtTokenProvider;
import com.universe.school.service.SchoolEmailPolicy;
import com.universe.global.security.TokenSessionService;
import com.universe.notification.service.NotificationService;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false",
        "spring.sql.init.mode=never", "spring.flyway.enabled=false", "spring.liquibase.enabled=false"})
@Import({AuthService.class, SchoolEmailPolicy.class, TrustScoreService.class, TrustScorePolicy.class, AuthSignupTrustTest.Config.class})
class AuthSignupTrustTest {
    @Autowired AuthService auth;
    @Autowired UserRepository users;
    @Autowired TrustHistoryRepository histories;
    @Autowired EntityManager em;
    @MockitoBean JwtTokenProvider jwt;
    @MockitoBean TokenSessionService sessions;
    @MockitoBean EmailVerificationService emailVerification;
    @MockitoBean NotificationService notifications;

    static class Config {
        @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    }

    @Test void newMemberStartsWithDefaultTrustScoreAndHistory() {
        var request = new SignupRequest();
        ReflectionTestUtils.setField(request, "email", "new@on.test.ac.kr");
        ReflectionTestUtils.setField(request, "password", "password1");
        ReflectionTestUtils.setField(request, "name", "name");
        ReflectionTestUtils.setField(request, "nickname", "nick");
        ReflectionTestUtils.setField(request, "department", "컴퓨터공학과");

        Long userId = auth.signup(request).getUserId();
        em.flush(); em.clear();

        assertThat(users.findById(userId).orElseThrow().getTrustScore()).isEqualTo(50);
        assertThat(histories.existsByUserId(userId)).isTrue();
    }

    @Test void signupWithSchoolEmailVerifiesSchoolAndStoresDepartment() {
        var request = new SignupRequest();
        ReflectionTestUtils.setField(request, "email", "Student@ON.mjc.ac.kr");
        ReflectionTestUtils.setField(request, "password", "password1");
        ReflectionTestUtils.setField(request, "name", "name");
        ReflectionTestUtils.setField(request, "nickname", "nick");
        ReflectionTestUtils.setField(request, "department", "컴퓨터공학과");

        Long userId = auth.signup(request).getUserId();
        em.flush(); em.clear();

        var user = users.findById(userId).orElseThrow();
        assertThat(user.getEmail()).isEqualTo("student@on.mjc.ac.kr");
        assertThat(user.getSchoolVerified()).isTrue();
        assertThat(user.getSchool().getEmailDomain()).isEqualTo("mjc.ac.kr");
        assertThat(user.getSchool().getSchoolName()).isEqualTo("명지전문대학");
        assertThat(user.getDepartment()).isEqualTo("컴퓨터공학과");
        verify(emailVerification).consume("student@on.mjc.ac.kr");
    }

    @Test void nonAcKrSchoolDomainResolvesToOrganizationRoot() {
        var request = new SignupRequest();
        ReflectionTestUtils.setField(request, "email", "student@g.skku.edu");
        ReflectionTestUtils.setField(request, "password", "password1");
        ReflectionTestUtils.setField(request, "name", "name");
        ReflectionTestUtils.setField(request, "nickname", "nick");
        ReflectionTestUtils.setField(request, "department", "경영학과");

        Long userId = auth.signup(request).getUserId();
        em.flush(); em.clear();

        assertThat(users.findById(userId).orElseThrow().getSchool().getEmailDomain()).isEqualTo("skku.edu");
    }

    @Test void publicMailDomainIsRejected() {
        var request = new SignupRequest();
        ReflectionTestUtils.setField(request, "email", "someone@naver.com");
        ReflectionTestUtils.setField(request, "password", "password1");
        ReflectionTestUtils.setField(request, "name", "name");
        ReflectionTestUtils.setField(request, "nickname", "nick");
        ReflectionTestUtils.setField(request, "department", "경영학과");

        assertThatThrownBy(() -> auth.signup(request))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.SCHOOL_EMAIL_REQUIRED));
    }
}
