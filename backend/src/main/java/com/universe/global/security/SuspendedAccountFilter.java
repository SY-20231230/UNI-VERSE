package com.universe.global.security;

import com.universe.global.exception.ErrorCode;
import com.universe.report.entity.SanctionType;
import com.universe.report.repository.UserSanctionRepository;
import com.universe.user.entity.AccountStatus;
import com.universe.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 정지된 계정은 로그인해 조회(GET)만 할 수 있다. 글쓰기·거래·채팅방 생성·찜 등 모든 쓰기 요청을 여기서 한 번에 막는다.
 * 로그아웃·토큰 재발급(/api/v1/auth/**)은 막지 않는다.
 * 스프링 빈으로 등록하면 서블릿 필터로도 자동 등록되므로 SecurityConfig에서 직접 생성해 보안 체인에만 넣는다.
 */
@RequiredArgsConstructor
public class SuspendedAccountFilter extends OncePerRequestFilter {
    private static final Set<String> READ_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private static final DateTimeFormatter UNTIL = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm");

    private final UserRepository users;
    private final UserSanctionRepository sanctions;
    private final ApiErrorResponseWriter errorResponseWriter;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return READ_METHODS.contains(request.getMethod()) || request.getRequestURI().startsWith("/api/v1/auth/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long userId)) {
            chain.doFilter(req, res);
            return;
        }
        AccountStatus status = users.findById(userId).map(u -> u.getAccountStatus()).orElse(AccountStatus.ACTIVE);
        if (status == AccountStatus.SUSPENDED) {
            var until = sanctions.findFirstByUserIdAndSanctionTypeOrderByStartAtDescIdDesc(userId, SanctionType.SUSPENSION)
                    .map(s -> s.getEndAt()).orElse(null);
            errorResponseWriter.write(res, ErrorCode.ACCOUNT_SUSPENDED, until == null ? ErrorCode.ACCOUNT_SUSPENDED.getMessage()
                    : until.format(UNTIL) + "까지 이용이 정지된 계정입니다. 정지 기간에는 조회만 할 수 있어요.");
            return;
        }
        if (status != AccountStatus.ACTIVE) {
            errorResponseWriter.write(res, ErrorCode.INACTIVE_ACCOUNT);
            return;
        }
        chain.doFilter(req, res);
    }
}
