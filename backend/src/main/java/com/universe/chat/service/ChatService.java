package com.universe.chat.service;

import com.universe.chat.dto.ChatMessageRequest;
import com.universe.chat.dto.ChatMessageResponse;
import com.universe.chat.entity.ChatRoom;
import com.universe.chat.entity.Message;
import com.universe.chat.repository.ChatRoomRepository;
import com.universe.chat.repository.MessageRepository;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {

    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;

    public List<ChatMessageResponse> getRoomMessages(Long roomId, Long userId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        // In a real application, verify if userId is part of this chat room
        // Assuming verification is done or simplified for now

        return messageRepository.findByRoomIdOrderByCreatedAtAsc(roomId).stream()
                .map(ChatMessageResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional
    public ChatMessageResponse saveMessage(ChatMessageRequest request, Long senderId) {
        ChatRoom room = chatRoomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Message message = Message.builder()
                .room(room)
                .sender(sender)
                .messageType(request.getType())
                .content(request.getContent())
                .build();

        Message savedMessage = messageRepository.save(message);
        return new ChatMessageResponse(savedMessage);
    }
}
