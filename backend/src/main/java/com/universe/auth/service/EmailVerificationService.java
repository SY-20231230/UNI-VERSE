package com.universe.auth.service;

import com.universe.auth.dto.response.EmailVerificationResponse;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.school.service.SchoolEmailPolicy;
import com.universe.school.service.SchoolMailService;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 회원가입 전 학교 이메일 인증번호 발송/확인.
 * 인증번호는 5분, 확인 완료 상태는 30분 동안 유지되며 가입이 끝나면 소모된다.
 */
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final long CODE_TTL_SECONDS = 300;
    private static final long VERIFIED_TTL_SECONDS = 1800;
    private static final long RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 5;

    private record Pending(String code, Instant expiresAt, Instant sentAt, int attempts) {}

    private final Map<String, Pending> pending = new ConcurrentHashMap<>();
    private final Map<String, Instant> verified = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    private final SchoolEmailPolicy policy;
    private final SchoolMailService mail;
    private final UserRepository users;

    public EmailVerificationResponse send(String rawEmail) {
        String email = policy.normalize(rawEmail);
        policy.validate(email);
        if (users.existsByEmail(email)) throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);

        Pending previous = pending.get(email);
        if (previous != null && Instant.now().isBefore(previous.sentAt().plusSeconds(RESEND_COOLDOWN_SECONDS))) {
            throw new BusinessException(ErrorCode.VERIFICATION_TOO_MANY_REQUESTS);
        }

        String code = String.valueOf(100000 + random.nextInt(900000));
        Instant now = Instant.now();
        pending.put(email, new Pending(code, now.plusSeconds(CODE_TTL_SECONDS), now, 0));
        verified.remove(email);
        // 메일 서버가 설정되지 않은 로컬 개발 환경에서만 코드가 반환된다.
        String devCode = mail.send(email, code);
        return new EmailVerificationResponse(email, CODE_TTL_SECONDS, false, devCode);
    }

    public EmailVerificationResponse confirm(String rawEmail, String code) {
        String email = policy.normalize(rawEmail);
        Pending p = pending.get(email);
        if (p == null) throw new BusinessException(ErrorCode.VERIFICATION_NOT_FOUND);
        if (Instant.now().isAfter(p.expiresAt()) || p.attempts() >= MAX_ATTEMPTS) {
            pending.remove(email);
            throw new BusinessException(ErrorCode.VERIFICATION_EXPIRED);
        }
        if (!p.code().equals(code == null ? "" : code.trim())) {
            pending.put(email, new Pending(p.code(), p.expiresAt(), p.sentAt(), p.attempts() + 1));
            throw new BusinessException(ErrorCode.VERIFICATION_CODE_MISMATCH);
        }
        pending.remove(email);
        verified.put(email, Instant.now().plusSeconds(VERIFIED_TTL_SECONDS));
        return new EmailVerificationResponse(email, VERIFIED_TTL_SECONDS, true, null);
    }

    /** 가입 직전에 호출: 인증이 끝난 이메일인지 확인하고 인증 상태를 소모한다. */
    public void consume(String rawEmail) {
        String email = policy.normalize(rawEmail);
        Instant until = verified.remove(email);
        if (until == null || Instant.now().isAfter(until)) throw new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED);
    }
}
