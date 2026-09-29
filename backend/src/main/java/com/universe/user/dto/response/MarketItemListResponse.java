package com.universe.user.dto.response;

import com.universe.market.entity.*;
import java.time.LocalDateTime;

/** My-page projection excludes purchasePrice, including for the seller. */
public record MarketItemListResponse(Long itemId, String title, ItemCategory category,
        ItemCondition itemCondition, Long listedPrice, TradeStatus tradeStatus, LocalDateTime createdAt) {
    public static MarketItemListResponse from(MarketItem item) {
        return new MarketItemListResponse(item.getId(), item.getTitle(), item.getCategory(), item.getItemCondition(),
                item.getListedPrice(), item.getTradeStatus(), item.getCreatedAt());
    }
}
