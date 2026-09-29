package com.universe.chat.entity;

import com.universe.community.entity.CommunityPost;
import com.universe.market.entity.MarketItem;
import com.universe.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_requests")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ChatRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    private MarketItem item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private CommunityPost post;

    @Enumerated(EnumType.STRING)
    @Column(name = "profile_mode", nullable = false, length = 20)
    private ChatProfileMode profileMode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChatRequestStatus status;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Builder
    public ChatRequest(User requester, User receiver, MarketItem item, CommunityPost post, ChatProfileMode profileMode) {
        this.requester = requester;
        this.receiver = receiver;
        this.item = item;
        this.post = post;
        this.profileMode = profileMode;
        this.status = ChatRequestStatus.PENDING;
    }

    public void accept() {
        this.status = ChatRequestStatus.ACCEPTED;
        this.respondedAt = LocalDateTime.now();
    }

    public void reject() {
        this.status = ChatRequestStatus.REJECTED;
        this.respondedAt = LocalDateTime.now();
    }
}
