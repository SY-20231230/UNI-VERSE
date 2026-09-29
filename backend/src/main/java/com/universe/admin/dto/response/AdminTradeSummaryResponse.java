package com.universe.admin.dto.response;
import com.universe.trade.entity.Trade;
import com.universe.market.entity.TradeStatus;
import java.time.LocalDateTime;
public record AdminTradeSummaryResponse(Long tradeId, Long itemId, Long sellerId, Long buyerId,
        Long listedPrice, Long finalPrice, TradeStatus status, LocalDateTime completedAt) {
    public static AdminTradeSummaryResponse from(Trade t) {
        return new AdminTradeSummaryResponse(t.getId(), t.getItem().getId(), t.getSeller().getId(),
                t.getBuyer().getId(), t.getListedPrice(), t.getFinalPrice(), t.getStatus(), t.getCompletedAt());
    }
}
