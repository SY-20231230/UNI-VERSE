package com.universe.trade.entity;

import com.universe.market.entity.MarketItem;
import com.universe.market.entity.TradeStatus;
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
@Table(name = "trades")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "trade_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private MarketItem item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @Column(name = "listed_price", nullable = false)
    private Long listedPrice;

    @Column(name = "final_price")
    private Long finalPrice;

    @Column(name = "seller_confirmed", nullable = false)
    private Boolean sellerConfirmed;

    @Column(name = "buyer_confirmed", nullable = false)
    private Boolean buyerConfirmed;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TradeStatus status;

    @Column(name = "started_at", nullable = false, updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Trade(MarketItem item, User seller, User buyer, Long listedPrice) {
        this.item = item;
        this.seller = seller;
        this.buyer = buyer;
        this.listedPrice = listedPrice;
        this.sellerConfirmed = false;
        this.buyerConfirmed = false;
        this.status = TradeStatus.TRADING;
        this.startedAt = LocalDateTime.now();
    }

    public void confirmBySeller() {
        this.sellerConfirmed = true;
        checkAndComplete();
    }

    public void confirmByBuyer() {
        this.buyerConfirmed = true;
        checkAndComplete();
    }

    private void checkAndComplete() {
        if (this.sellerConfirmed && this.buyerConfirmed) {
            this.status = TradeStatus.COMPLETED;
            this.completedAt = LocalDateTime.now();
        }
    }

    public void setFinalPrice(Long finalPrice) {
        this.finalPrice = finalPrice;
    }
}
