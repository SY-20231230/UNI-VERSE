package com.universe.chat.controller;

import com.universe.chat.dto.ChatRoomCreateRequest;
import com.universe.chat.dto.ChatRoomDto;
import com.universe.chat.service.ChatService;
import com.universe.global.common.ApiResponse;
import com.universe.global.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatApiController {
    private final ChatService chatService;

    @PostMapping("/rooms")
    public ApiResponse<ChatRoomDto> createRoom(@RequestBody ChatRoomCreateRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ApiResponse.success(chatService.createRoom(userId, request));
    }

    @GetMapping("/rooms")
    public ApiResponse<List<ChatRoomDto>> getMyRooms() {
        Long userId = SecurityUtil.getCurrentUserId();
        return ApiResponse.success(chatService.getMyRooms(userId));
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ApiResponse<List<com.universe.chat.dto.ChatMessageResponse>> getMessages(@PathVariable Long roomId) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ApiResponse.success(chatService.getRoomMessages(roomId, userId));
    }
}
