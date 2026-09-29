package com.universe.chat.dto;
import com.universe.chat.entity.ChatProfileMode;
import com.universe.chat.entity.ChatRoom;
import com.universe.chat.entity.ChatRoomStatus;
import lombok.Getter;

@Getter
public class ChatRoomDto {
    private Long roomId;
    private Long itemId;
    private ChatProfileMode profileMode;
    private ChatRoomStatus status;
    private Long partnerId;
    private String partnerName;
    
    public ChatRoomDto(ChatRoom room, Long pId, String pName) {
        this.roomId = room.getId();
        this.itemId = room.getItem() != null ? room.getItem().getId() : null;
        this.profileMode = room.getProfileMode();
        this.status = room.getRoomStatus();
        this.partnerId = pId;
        this.partnerName = pName;
    }
}
