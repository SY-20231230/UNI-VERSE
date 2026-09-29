package com.universe.report.service;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import org.springframework.security.authentication.AuthenticationTrustResolverImpl;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/** Integration contract: verified JWT authentication.getName() is the decimal users.user_id. */
@Component
public class ReportCurrentUser {
    private final AuthenticationTrustResolverImpl trustResolver = new AuthenticationTrustResolverImpl();

    public Long requireId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || trustResolver.isAnonymous(authentication)) {
            throw unauthenticated();
        }
        String name = authentication.getName();
        if (name == null || !name.matches("[1-9][0-9]{0,18}")) throw unauthenticated();
        try {
            return Long.valueOf(name);
        } catch (NumberFormatException exception) {
            throw unauthenticated();
        }
    }

    private BusinessException unauthenticated() {
        return new BusinessException(ErrorCode.UNAUTHORIZED);
    }
}
