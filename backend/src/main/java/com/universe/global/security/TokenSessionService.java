package com.universe.global.security;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenSessionService {
    private final ConcurrentHashMap<Long, Instant> invalidBefore = new ConcurrentHashMap<>();
    public void logout(Long userId){ invalidBefore.put(userId, Instant.now()); }
    public boolean isInvalid(Long userId, Instant issuedAt){ Instant t=invalidBefore.get(userId); return t!=null && !issuedAt.isAfter(t); }
}
