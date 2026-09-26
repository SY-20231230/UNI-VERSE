package com.universe.notification.event;

import com.universe.market.entity.TradeStatus;

/** actorId 는 상태를 바꾼 사용자로, 찜한 사람이더라도 알림에서 제외한다. */
public record MarketItemStatusChangedEvent(Long itemId, String itemTitle, TradeStatus tradeStatus, Long actorId) {
}
