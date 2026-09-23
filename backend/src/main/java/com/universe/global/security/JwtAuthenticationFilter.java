package com.universe.global.security;

import com.universe.user.entity.UserRole;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenProvider jwt; private final TokenSessionService sessions;
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
        String h=req.getHeader("Authorization");
        if(h!=null && h.startsWith("Bearer ")){
            try{ String token=h.substring(7); Claims claims=jwt.parse(token);
                if(!"ACCESS".equals(claims.get("type",String.class))){
                    reject(res);
                    return;
                }
                Long id=Long.valueOf(claims.getSubject());
                if(claims.getIssuedAt()==null||sessions.isInvalid(id,claims.getIssuedAt().toInstant())){
                    reject(res);
                    return;
                }
                UserRole role=UserRole.valueOf(claims.get("role",String.class));
                var auth=new UsernamePasswordAuthenticationToken(id,null,List.of(new SimpleGrantedAuthority("ROLE_"+role.name())));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }catch(Exception e){
                SecurityContextHolder.clearContext();
                reject(res);
                return;
            }
        }
        chain.doFilter(req,res);
    }

    private void reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"success\":false,\"code\":\"INVALID_TOKEN\",\"message\":\"유효하지 않은 인증 토큰입니다.\",\"data\":null}");
    }
}
