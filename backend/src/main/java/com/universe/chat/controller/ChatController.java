package com.universe.chat.controller;

import com.universe.chat.dto.ChatMessageRequest;
import com.universe.chat.dto.ChatMessageResponse;
import com.universe.chat.service.ChatService;
import com.universe.global.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessageSendingOperations messagingTemplate;
    private final ChatService chatService;

    // STOMP WebSocket Endpoint
    @MessageMapping("/chat/message")
    public void sendMessage(@org.springframework.messaging.handler.annotation.Payload ChatMessageRequest messageRequest, org.springframework.messaging.simp.SimpMessageHeaderAccessor headerAccessor) {
        Long senderId = null;
        if (headerAccessor.getSessionAttributes() != null && headerAccessor.getSessionAttributes().get("USER_ID") != null) {
            senderId = (Long) headerAccessor.getSessionAttributes().get("USER_ID");
        } else if (headerAccessor.getUser() != null) {
            senderId = Long.parseLong(headerAccessor.getUser().getName());
        }
        if (senderId == null) throw new IllegalArgumentException("Unauthorized websocket message");
        
        ChatMessageResponse response = chatService.saveMessage(messageRequest, senderId);
        
        // Broadcast to the specific room topic
        messagingTemplate.convertAndSend("/sub/chat/room/" + messageRequest.getRoomId(), response);
    }
}
