package com.universe.auth.service;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.school.repository.SchoolRepository;
import com.universe.school.service.SchoolEmailPolicy;
import com.universe.school.service.SchoolMailService;
import com.universe.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class EmailVerificationServiceTest {
    SchoolRepository schools = mock(SchoolRepository.class);
    SchoolMailService mail = mock(SchoolMailService.class);
    UserRepository users = mock(UserRepository.class);
    EmailVerificationService service;

    @BeforeEach void setUp() {
        when(schools.findByEmailDomainIgnoreCase(anyString())).thenReturn(Optional.empty());
        // 메일 미설정 환경처럼 발송한 코드를 그대로 돌려준다.
        when(mail.send(anyString(), anyString())).thenAnswer(inv -> inv.getArgument(1));
        service = new EmailVerificationService(new SchoolEmailPolicy(schools), mail, users);
    }

    @Test void schoolEmailCanBeVerifiedAndConsumedOnce() {
        String code = service.send("Student@on.mjc.ac.kr").getVerificationCode();

        assertThat(service.confirm("student@on.mjc.ac.kr", code).isVerified()).isTrue();
        assertThatCode(() -> service.consume("student@on.mjc.ac.kr")).doesNotThrowAnyException();
        assertError(() -> service.consume("student@on.mjc.ac.kr"), ErrorCode.EMAIL_NOT_VERIFIED);
    }

    @Test void publicAndNonAcademicDomainsAreRejected() {
        assertError(() -> service.send("me@naver.com"), ErrorCode.SCHOOL_EMAIL_REQUIRED);
        assertError(() -> service.send("me@gmail.com"), ErrorCode.SCHOOL_EMAIL_REQUIRED);
        assertError(() -> service.send("me@samsung.com"), ErrorCode.SCHOOL_EMAIL_REQUIRED);
        verifyNoInteractions(mail);
    }

    @Test void wrongCodeFailsAndLocksAfterFiveAttempts() {
        service.send("a@mjc.ac.kr");
        for (int i = 0; i < 5; i++) assertError(() -> service.confirm("a@mjc.ac.kr", "000000"), ErrorCode.VERIFICATION_CODE_MISMATCH);
        assertError(() -> service.confirm("a@mjc.ac.kr", "000000"), ErrorCode.VERIFICATION_EXPIRED);
    }

    @Test void resendWithinCooldownIsRejected() {
        service.send("a@mjc.ac.kr");
        assertError(() -> service.send("a@mjc.ac.kr"), ErrorCode.VERIFICATION_TOO_MANY_REQUESTS);
    }

    @Test void alreadyRegisteredEmailIsRejected() {
        when(users.existsByEmail("a@mjc.ac.kr")).thenReturn(true);
        assertError(() -> service.send("a@mjc.ac.kr"), ErrorCode.DUPLICATE_EMAIL);
    }

    @Test void signupWithoutVerificationIsRejected() {
        assertError(() -> service.consume("a@mjc.ac.kr"), ErrorCode.EMAIL_NOT_VERIFIED);
    }

    private void assertError(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, ErrorCode code) {
        assertThatThrownBy(call).isInstanceOfSatisfying(BusinessException.class, e -> assertThat(e.getErrorCode()).isEqualTo(code));
    }
}
