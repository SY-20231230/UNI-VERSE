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
 * 학교마다 메일 형식이 달라(ac.kr, .edu, 자체 도메인 등) 일반 포털/메일 서비스 도메인만 차단하고 나머지는 허용한다.
 * 차단: 네이버·다음·구글·MS·애플 등 누구나 가입할 수 있는 메일 서비스
 */
@Component
@RequiredArgsConstructor
public class SchoolEmailPolicy {

    private static final Set<String> PUBLIC_DOMAINS = Set.of(
            // 국내 포털
            "naver.com", "daum.net", "hanmail.net", "kakao.com", "nate.com", "empas.com", "korea.com",
            "hanmir.com", "dreamwiz.com", "chol.com", "paran.com", "freechal.com", "lycos.co.kr", "netian.com",
            // 해외 메일 서비스
            "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.kr", "ymail.com",
            "hotmail.com", "hotmail.co.kr", "outlook.com", "outlook.kr", "live.com", "live.co.kr", "msn.com",
            "icloud.com", "me.com", "mac.com", "aol.com", "mail.com", "gmx.com", "gmx.net",
            "proton.me", "protonmail.com", "zoho.com", "yandex.com", "qq.com", "163.com", "126.com");

    /** 두 단계 국가 도메인: 이 앞 라벨까지가 기관 도메인이다 (on.mjc.ac.kr → mjc.ac.kr). */
    private static final Set<String> SECOND_LEVEL_SUFFIXES = Set.of(
            "ac.kr", "co.kr", "or.kr", "go.kr", "re.kr", "ne.kr", "pe.kr",
            "ac.jp", "ac.uk", "edu.au", "edu.cn");

    private final SchoolRepository schools;

    public String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    /** 가입 가능한 학교 이메일인지 검사한다. 통과하지 못하면 예외. */
    public void validate(String email) {
        String domain = domainOf(email);
        if (domain.isEmpty() || !domain.contains(".") || isPublic(domain)) {
            throw new BusinessException(ErrorCode.SCHOOL_EMAIL_REQUIRED);
        }
    }

    /** 이메일 도메인에 해당하는 학교를 찾고, 없으면 *.ac.kr 대표 도메인으로 새로 등록한다. */
    public School resolveSchool(String email) {
        validate(email);
        String domain = domainOf(email);
        School school = findRegistered(domain).orElseGet(() -> {
            String root = organizationRoot(domain);
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

    /** 서브도메인을 떼어 학교 대표 도메인을 구한다. on.mjc.ac.kr → mjc.ac.kr, g.skku.edu → skku.edu */
    private String organizationRoot(String domain) {
        String[] labels = domain.split("\\.");
        int n = labels.length;
        int keep = n >= 3 && SECOND_LEVEL_SUFFIXES.contains(labels[n - 2] + "." + labels[n - 1]) ? 3 : 2;
        return n <= keep ? domain : String.join(".", Arrays.copyOfRange(labels, n - keep, n));
    }
}
