package com.universe.chat.entity;

import com.universe.market.entity.MarketItem;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_rooms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false, unique = true)
    private ChatRequest request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    private MarketItem item;

    @Enumerated(EnumType.STRING)
    @Column(name = "profile_mode", nullable = false, length = 20)
    private ChatProfileMode profileMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_status", nullable = false, length = 20)
    private ChatRoomStatus roomStatus;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public ChatRoom(ChatRequest request, MarketItem item, ChatProfileMode profileMode) {
        this.request = request;
        this.item = item;
        this.profileMode = profileMode;
        this.roomStatus = ChatRoomStatus.ACTIVE;
    }

    public void changeStatus(ChatRoomStatus status) {
        this.roomStatus = status;
    }
}
