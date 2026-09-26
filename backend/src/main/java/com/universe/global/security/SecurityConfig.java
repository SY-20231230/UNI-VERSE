package com.universe.global.security;

import lombok.RequiredArgsConstructor;
import com.universe.global.exception.ErrorCode;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration @EnableWebSecurity @RequiredArgsConstructor
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtFilter;
    private final ApiAuthenticationEntryPoint authenticationEntryPoint;
    private final ApiErrorResponseWriter errorResponseWriter;
    @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http)throws Exception{
        return http.csrf(csrf->csrf.disable()).formLogin(f->f.disable()).httpBasic(h->h.disable())
            .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers("/api/v1/auth/signup","/api/v1/auth/login","/api/v1/auth/refresh","/api/v1/schools","/error").permitAll().anyRequest().authenticated())
            .exceptionHandling(e->e.authenticationEntryPoint(authenticationEntryPoint).accessDeniedHandler((req,res,ex)->errorResponseWriter.write(res,ErrorCode.FORBIDDEN)))
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class).build();
    }
}
