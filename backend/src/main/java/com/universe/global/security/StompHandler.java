package com.universe.global.security;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
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

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authorizationHeader = accessor.getFirstNativeHeader("Authorization");
            
            if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                String token = authorizationHeader.substring(7);
                try {
                    if (jwtTokenProvider.isAccess(token)) {
                        Long userId = jwtTokenProvider.getUserId(token);
                        Authentication authentication = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                                String.valueOf(userId), null, java.util.Collections.emptyList());
                        accessor.setUser(authentication);
                    } else {
                        throw new BusinessException(ErrorCode.INVALID_TOKEN);
                    }
                } catch (Exception e) {
                    throw new BusinessException(ErrorCode.INVALID_TOKEN);
                }
            } else {
                throw new BusinessException(ErrorCode.UNAUTHORIZED);
            }
        }
        
        return message;
    }
}
