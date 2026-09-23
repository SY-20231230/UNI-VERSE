package com.universe.global.security;

import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
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
    private final JwtTokenProvider jwt; private final TokenSessionService sessions; private final UserRepository users;
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
        String h=req.getHeader("Authorization");
        if(h!=null && h.startsWith("Bearer ")){
            try{ String token=h.substring(7); Claims c=jwt.parse(token); Long id=Long.valueOf(c.getSubject());
                if(!jwt.isRefresh(token) && !sessions.isInvalid(id,c.getIssuedAt().toInstant())){
                    User u=users.findById(id).orElse(null);
                    if(u!=null && u.getAccountStatus().name().equals("ACTIVE")){
                        var auth=new UsernamePasswordAuthenticationToken(id,null,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole().name())));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                }
            }catch(Exception ignored){ }
        }
        chain.doFilter(req,res);
    }
}
