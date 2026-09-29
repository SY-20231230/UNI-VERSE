package com.universe.global.security;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.user.entity.AccountStatus;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StompHandler implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository users;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor != null) {
            if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                String authorizationHeader = accessor.getFirstNativeHeader("Authorization");
                if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                    String token = authorizationHeader.substring(7);
                    try {
                        if (jwtTokenProvider.isAccess(token)) {
                            Long userId = jwtTokenProvider.getUserId(token);
                            if (accessor.getSessionAttributes() != null) {
                                accessor.getSessionAttributes().put("USER_ID", userId);
                            }
                            Authentication authentication = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                                    String.valueOf(userId), null, java.util.Collections.emptyList());
                            accessor.setUser(authentication);
                        }
                    } catch (Exception e) {
                        // Ignore, let controller handle unauthorized
                    }
                }
            }
            // 정지 등으로 활성 상태가 아닌 회원의 채팅 전송은 버린다 (HTTP 쓰기는 SuspendedAccountFilter가 막는다).
            if (StompCommand.SEND.equals(accessor.getCommand()) && accessor.getSessionAttributes() != null
                    && accessor.getSessionAttributes().get("USER_ID") instanceof Long userId
                    && users.findById(userId).map(u -> u.getAccountStatus() != AccountStatus.ACTIVE).orElse(false)) {
                return null;
            }
        }
        
        return message;
    }
}
