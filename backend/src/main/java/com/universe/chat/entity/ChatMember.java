package com.universe.chat.entity;

import com.universe.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(ChatMemberId.class)
public class ChatMember {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoom room;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_read_message_id")
    private Message lastReadMessage;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @Builder
    public ChatMember(ChatRoom room, User user) {
        this.room = room;
        this.user = user;
        this.joinedAt = LocalDateTime.now();
    }

    public void updateLastReadMessage(Message message) {
        this.lastReadMessage = message;
    }
}
