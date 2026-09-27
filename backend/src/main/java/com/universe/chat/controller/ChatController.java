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

    // HTTP Endpoint to fetch history
    @GetMapping("/api/chat/rooms/{roomId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> getMessages(@PathVariable Long roomId) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(chatService.getRoomMessages(roomId, userId));
    }

    // STOMP WebSocket Endpoint
    @MessageMapping("/chat/message")
    public void sendMessage(ChatMessageRequest messageRequest, Authentication authentication) {
        // When using STOMP, Authentication is set by StompHandler
        Long senderId = Long.parseLong(authentication.getName());
        
        ChatMessageResponse response = chatService.saveMessage(messageRequest, senderId);
        
        // Broadcast to the specific room topic
        messagingTemplate.convertAndSend("/sub/chat/room/" + messageRequest.getRoomId(), response);
    }
}
