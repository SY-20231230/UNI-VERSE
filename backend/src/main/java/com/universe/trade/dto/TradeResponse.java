package com.universe.trade.dto;

import com.universe.market.entity.TradeStatus;
import com.universe.trade.entity.Trade;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class TradeResponse {
    private Long tradeId;
    private Long itemId;
    private String itemTitle;
    private Long sellerId;
    private String sellerNickname;
    private Long buyerId;
    private String buyerNickname;
    private Long listedPrice;
    private Long finalPrice;
    private Boolean sellerConfirmed;
    private Boolean buyerConfirmed;
    private TradeStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    public TradeResponse(Trade trade) {
        this.tradeId = trade.getId();
        this.itemId = trade.getItem().getId();
        this.itemTitle = trade.getItem().getTitle();
        this.sellerId = trade.getSeller().getId();
        this.sellerNickname = trade.getSeller().getNickname();
        this.buyerId = trade.getBuyer().getId();
        this.buyerNickname = trade.getBuyer().getNickname();
        this.listedPrice = trade.getListedPrice();
        this.finalPrice = trade.getFinalPrice();
        this.sellerConfirmed = trade.getSellerConfirmed();
        this.buyerConfirmed = trade.getBuyerConfirmed();
        this.status = trade.getStatus();
        this.startedAt = trade.getStartedAt();
        this.completedAt = trade.getCompletedAt();
    }
}
