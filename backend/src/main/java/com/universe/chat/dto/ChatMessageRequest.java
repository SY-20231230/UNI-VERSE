package com.universe.chat.dto;

import com.universe.chat.entity.MessageType;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChatMessageRequest {
    private Long roomId;
    private MessageType type;
    private String content;
}
