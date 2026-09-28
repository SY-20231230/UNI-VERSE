package com.universe.chat.dto;
import com.universe.chat.entity.ChatProfileMode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChatRoomCreateRequest {
    private Long itemId;
    private Long receiverId;
    private ChatProfileMode profileMode;
}
