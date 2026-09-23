package com.universe.global.util;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtil {
    private SecurityUtil() {}

    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        
        if (authentication.getPrincipal() instanceof Long) {
            return (Long) authentication.getPrincipal();
        } else if (authentication.getPrincipal() instanceof String) {
            try {
                return Long.parseLong((String) authentication.getPrincipal());
            } catch (NumberFormatException e) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED);
            }
        }
        
        throw new BusinessException(ErrorCode.UNAUTHORIZED);
    }
}
