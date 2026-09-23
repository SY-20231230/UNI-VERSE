package com.universe.global.security;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

@Component
@RequiredArgsConstructor
public class JwtTokenProvider {
    @Value("${jwt.secret-key}") private String secret;
    private SecretKey key;
    private static final Duration ACCESS_TTL=Duration.ofMinutes(30);
    private static final Duration REFRESH_TTL=Duration.ofDays(14);
    @PostConstruct void init(){ key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); }
    public String createAccessToken(Long userId, String role){ return create(userId, role, "ACCESS", ACCESS_TTL); }
    public String createRefreshToken(Long userId, String role){ return create(userId, role, "REFRESH", REFRESH_TTL); }
    private String create(Long id,String role,String type,Duration ttl){
        Instant now=Instant.now();
        return Jwts.builder().subject(String.valueOf(id)).claim("role",role).claim("type",type)
                .issuedAt(Date.from(now)).expiration(Date.from(now.plus(ttl))).signWith(key).compact();
    }
    public Claims parse(String token){
        try { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload(); }
        catch(Exception e){ throw new BusinessException(ErrorCode.INVALID_TOKEN); }
    }
    public Long getUserId(String token){ try{return Long.valueOf(parse(token).getSubject());}catch(NumberFormatException e){throw new BusinessException(ErrorCode.INVALID_TOKEN);} }
    public boolean isRefresh(String token){ return "REFRESH".equals(parse(token).get("type",String.class)); }
    public Instant getIssuedAt(String token){ return parse(token).getIssuedAt().toInstant(); }
}
