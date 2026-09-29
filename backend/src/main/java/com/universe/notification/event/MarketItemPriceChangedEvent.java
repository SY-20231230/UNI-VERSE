package com.universe.notification.event;

/** 공개 가격(listedPrice)만 다룬다. purchasePrice 는 절대 담지 않는다. */
public record MarketItemPriceChangedEvent(Long itemId, String itemTitle, Long oldListedPrice, Long newListedPrice,
        Long sellerId) {
}
