package com.universe.global.security;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {
    private CurrentUser(){}
    public static Long id(){ Authentication a=SecurityContextHolder.getContext().getAuthentication(); if(a==null || !(a.getPrincipal() instanceof Long)) throw new BusinessException(ErrorCode.UNAUTHORIZED); return (Long)a.getPrincipal(); }
}
