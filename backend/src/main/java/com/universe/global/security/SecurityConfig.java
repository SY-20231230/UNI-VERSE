package com.universe.global.security;

import lombok.RequiredArgsConstructor;
import com.universe.global.exception.ErrorCode;
import com.universe.report.repository.UserSanctionRepository;
import com.universe.user.repository.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration @EnableWebSecurity @RequiredArgsConstructor
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtFilter;
    private final ApiAuthenticationEntryPoint authenticationEntryPoint;
    private final ApiErrorResponseWriter errorResponseWriter;
    private final UserRepository users;
    private final UserSanctionRepository sanctions;

    @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .formLogin(f -> f.disable())
            .httpBasic(h -> h.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers(
                    "/api/v1/auth/signup",
                    "/api/v1/auth/email-verifications",
                    "/api/v1/auth/email-verifications/confirm",
                    "/api/v1/auth/login",
                    "/api/v1/auth/refresh",
                    "/api/v1/schools",
                    "/actuator/health",
                    "/actuator/health/**",
                    "/error",
                    "/api/v1/images",
                    "/uploads/**",
                    "/ws-stomp/**"  // SockJS WebSocket 핸드셰이크 허용
                ).permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(e -> e
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler((req, res, ex) -> errorResponseWriter.write(res, ErrorCode.FORBIDDEN))
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(new SuspendedAccountFilter(users, sanctions, errorResponseWriter), JwtAuthenticationFilter.class)
            .build();
    }
}
