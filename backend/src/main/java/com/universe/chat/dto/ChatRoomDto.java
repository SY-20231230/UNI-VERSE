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
    /** 내가 아직 읽지 않은 상대 메시지 수 */
    private long unreadCount;
    /** 상대가 마지막으로 읽은 메시지 ID (내 메시지의 읽음 표시에 사용, 없으면 null) */
    private Long partnerLastReadMessageId;
    
    public ChatRoomDto(ChatRoom room, Long pId, String pName) {
        this.roomId = room.getId();
        this.itemId = room.getItem() != null ? room.getItem().getId() : null;
        this.profileMode = room.getProfileMode();
        this.status = room.getRoomStatus();
        this.partnerId = pId;
        this.partnerName = pName;
    }

    public ChatRoomDto(ChatRoom room, Long pId, String pName, long unreadCount, Long partnerLastReadMessageId) {
        this(room, pId, pName);
        this.unreadCount = unreadCount;
        this.partnerLastReadMessageId = partnerLastReadMessageId;
    }
}
