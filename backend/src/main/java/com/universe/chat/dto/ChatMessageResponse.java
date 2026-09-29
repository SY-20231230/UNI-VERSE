package com.universe.chat.dto;

import com.universe.chat.entity.Message;
import com.universe.chat.entity.MessageType;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class ChatMessageResponse {
    private Long messageId;
    private Long roomId;
    private Long senderId;
    private String senderNickname;
    private MessageType type;
    private String content;
    private LocalDateTime createdAt;

    public ChatMessageResponse(Message message) {
        this.messageId = message.getId();
        this.roomId = message.getRoom().getId();
        this.senderId = message.getSender() != null ? message.getSender().getId() : null;
        this.senderNickname = message.getSender() != null ? message.getSender().getNickname() : null;
        this.type = message.getMessageType();
        this.content = message.getContent();
        this.createdAt = message.getCreatedAt();
    }
}
