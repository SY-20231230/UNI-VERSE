package com.universe.chat.service;

import com.universe.chat.dto.ChatMessageRequest;
import com.universe.chat.dto.ChatMessageResponse;
import com.universe.chat.dto.ChatRoomCreateRequest;
import com.universe.chat.dto.ChatRoomDto;
import com.universe.chat.entity.*;
import com.universe.chat.repository.ChatMemberRepository;
import com.universe.chat.repository.ChatRequestRepository;
import com.universe.chat.repository.ChatRoomRepository;
import com.universe.chat.repository.MessageRepository;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.notification.entity.NotificationType;
import com.universe.notification.service.NotificationService;
import com.universe.market.entity.MarketItem;
import com.universe.market.repository.MarketItemRepository;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
    private final ChatRequestRepository chatRequestRepository;
    private final ChatMemberRepository chatMemberRepository;
    private final UserRepository userRepository;
    private final MarketItemRepository itemRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    @Transactional
    public ChatRoomDto createRoom(Long requesterId, ChatRoomCreateRequest request) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        MarketItem item = null;
        if (request.getItemId() != null) {
            item = itemRepository.findById(request.getItemId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        }

        // Direct room creation (simplifying request/accept flow for immediate chat)
        ChatRequest chatRequest = ChatRequest.builder()
                .requester(requester)
                .receiver(receiver)
                .item(item)
                .profileMode(request.getProfileMode())
                .build();
        chatRequest.accept();
        chatRequestRepository.save(chatRequest);

        ChatRoom room = ChatRoom.builder()
                .request(chatRequest)
                .item(item)
                .profileMode(request.getProfileMode())
                .build();
        chatRoomRepository.save(room);

        ChatMember member1 = ChatMember.builder().room(room).user(requester).build();
        ChatMember member2 = ChatMember.builder().room(room).user(receiver).build();
        chatMemberRepository.saveAll(List.of(member1, member2));

        String initialMessageText = "안녕하세요! \"" + (item != null ? item.getTitle() : "상품") + "\" 구매하고 싶습니다.";
        Message initialMessage = Message.builder()
                .room(room)
                .sender(requester)
                .messageType(MessageType.TEXT)
                .content(initialMessageText)
                .build();
        messageRepository.save(initialMessage);

        Long receiverId = receiver.getId();
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
            new org.springframework.transaction.support.TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    messagingTemplate.convertAndSend("/sub/chat/user/" + receiverId, "{\"type\":\"NEW_ROOM\"}");
                }
            }
        );

        String title = item != null ? item.getTitle() : "상품";
        notificationService.send(receiverId, NotificationType.CHAT_REQUEST,
                "'" + title + "'에 대한 새로운 대화 요청이 도착했습니다.", room.getId());

        return new ChatRoomDto(room, receiver.getId(), receiver.getNickname());
    }

    public List<ChatRoomDto> getMyRooms(Long userId) {
        List<ChatMember> memberships = chatMemberRepository.findByUserId(userId);
        return memberships.stream().map(m -> {
            ChatRoom room = m.getRoom();
            User partner = chatMemberRepository.findByRoomId(room.getId()).stream()
                    .filter(cm -> !cm.getUser().getId().equals(userId))
                    .map(ChatMember::getUser)
                    .findFirst().orElse(null);
            
            Long pId = partner != null ? partner.getId() : null;
            String pName = partner != null ? partner.getNickname() : "알 수 없음";
            
            return new ChatRoomDto(room, pId, pName);
        }).collect(Collectors.toList());
    }

    public List<ChatMessageResponse> getRoomMessages(Long roomId, Long userId) {
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
        return new ChatMessageResponse(messageRepository.save(message));
    }

    @Transactional
    public void deleteRoom(Long roomId, Long userId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        // Verify user is member of room
        List<ChatMember> members = chatMemberRepository.findByRoomId(roomId);
        boolean isMember = members.stream().anyMatch(m -> m.getUser().getId().equals(userId));
        if (!isMember) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // Delete all messages
        messageRepository.deleteByRoomId(roomId);
        // Delete all members
        chatMemberRepository.deleteByRoomId(roomId);
        // Delete room
        chatRoomRepository.delete(room);
        // Delete chat request if exists
        if (room.getRequest() != null) {
            chatRequestRepository.delete(room.getRequest());
        }
    }
}
