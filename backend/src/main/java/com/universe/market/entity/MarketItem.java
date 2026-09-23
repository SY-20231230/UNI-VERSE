package com.universe.market.entity;

import com.universe.school.entity.School;
import com.universe.user.entity.User;
import com.universe.ai.entity.AiAnalysisResult;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "market_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class MarketItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Column(nullable = false, length = 150)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ItemCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_condition", nullable = false, length = 20)
    private ItemCondition itemCondition;

    @Column(name = "purchase_price", nullable = false)
    private Long purchasePrice;

    @Column(name = "listed_price", nullable = false)
    private Long listedPrice;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "trade_status", nullable = false, length = 20)
    private TradeStatus tradeStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_status", length = 20)
    private AiAnalysisResult aiStatus;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public MarketItem(User seller, School school, String title, ItemCategory category, ItemCondition itemCondition, Long purchasePrice, Long listedPrice, String description) {
        this.seller = seller;
        this.school = school;
        this.title = title;
        this.category = category;
        this.itemCondition = itemCondition;
        this.purchasePrice = purchasePrice;
        this.listedPrice = listedPrice;
        this.description = description;
        this.tradeStatus = TradeStatus.SELLING;
    }

    // 소유권 검증 메서드
    public boolean isSeller(Long userId) {
        return this.seller.getId().equals(userId);
    }

    // 비즈니스 메서드
    public void updateContent(String title, String description, ItemCategory category, ItemCondition condition, Long listedPrice, Long purchasePrice) {
        this.title = title;
        this.description = description;
        this.category = category;
        this.itemCondition = condition;
        this.listedPrice = listedPrice;
        this.purchasePrice = purchasePrice;
    }

    public void updateAiStatus(AiAnalysisResult status) {
        this.aiStatus = status;
    }

    public void changeTradeStatus(TradeStatus status) {
        this.tradeStatus = status;
    }
}
