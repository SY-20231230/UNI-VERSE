package com.universe.school.service;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.school.entity.School;
import com.universe.school.entity.SchoolStatus;
import com.universe.school.repository.SchoolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * 회원가입에 쓸 수 있는 학교 이메일인지 판별하고, 도메인에 해당하는 학교를 찾는다.
 * 허용: 등록된 학교 도메인(서브도메인 포함, 예: on.mjc.ac.kr → mjc.ac.kr) 또는 *.ac.kr
 * 차단: 네이버·다음·구글 등 일반 포털/메일 서비스 도메인
 */
@Component
@RequiredArgsConstructor
public class SchoolEmailPolicy {

    private static final Set<String> PUBLIC_DOMAINS = Set.of(
            "naver.com", "daum.net", "hanmail.net", "kakao.com", "nate.com", "empas.com", "korea.com",
            "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.kr", "hotmail.com", "outlook.com",
            "live.com", "msn.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com");

    private static final String ACADEMIC_SUFFIX = ".ac.kr";

    private final SchoolRepository schools;

    public String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    /** 가입 가능한 학교 이메일인지 검사한다. 통과하지 못하면 예외. */
    public void validate(String email) {
        String domain = domainOf(email);
        if (domain.isEmpty() || isPublic(domain)) throw new BusinessException(ErrorCode.SCHOOL_EMAIL_REQUIRED);
        if (findRegistered(domain).isEmpty() && !domain.endsWith(ACADEMIC_SUFFIX)) {
            throw new BusinessException(ErrorCode.SCHOOL_EMAIL_REQUIRED);
        }
    }

    /** 이메일 도메인에 해당하는 학교를 찾고, 없으면 *.ac.kr 대표 도메인으로 새로 등록한다. */
    public School resolveSchool(String email) {
        validate(email);
        String domain = domainOf(email);
        School school = findRegistered(domain).orElseGet(() -> {
            String root = academicRoot(domain);
            String name = KnownSchools.nameOf(root).orElse(root);
            return schools.save(School.builder().schoolName(name).emailDomain(root).build());
        });
        // 예전에 도메인 이름으로 자동 등록된 학교는 알려진 학교 이름으로 바꿔준다.
        if (school.getSchoolName().equalsIgnoreCase(school.getEmailDomain())) {
            KnownSchools.nameOf(school.getEmailDomain()).ifPresent(school::rename);
        }
        if (school.getStatus() != SchoolStatus.ACTIVE) throw new BusinessException(ErrorCode.SCHOOL_NOT_ACTIVE);
        return school;
    }

    private String domainOf(String email) {
        String normalized = normalize(email);
        int at = normalized.lastIndexOf('@');
        return at < 0 ? "" : normalized.substring(at + 1);
    }

    private boolean isPublic(String domain) {
        return PUBLIC_DOMAINS.stream().anyMatch(p -> domain.equals(p) || domain.endsWith("." + p));
    }

    /** on.mjc.ac.kr → on.mjc.ac.kr, mjc.ac.kr 순으로 등록된 학교 도메인을 찾는다. */
    private Optional<School> findRegistered(String domain) {
        String[] labels = domain.split("\\.");
        for (int i = 0; i < labels.length - 1; i++) {
            String candidate = String.join(".", Arrays.copyOfRange(labels, i, labels.length));
            Optional<School> school = schools.findByEmailDomainIgnoreCase(candidate);
            if (school.isPresent()) return school;
        }
        return Optional.empty();
    }

    /** on.mjc.ac.kr → mjc.ac.kr (ac.kr 바로 앞 라벨까지) */
    private String academicRoot(String domain) {
        String[] labels = domain.split("\\.");
        return labels.length <= 3 ? domain : String.join(".", Arrays.copyOfRange(labels, labels.length - 3, labels.length));
    }
}
