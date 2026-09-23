package com.universe.market.repository;

import com.universe.market.entity.MarketItemFavorite;
import com.universe.market.entity.MarketItemFavoriteId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketItemFavoriteRepository extends JpaRepository<MarketItemFavorite, MarketItemFavoriteId> {
    boolean existsByItemIdAndUserId(Long itemId, Long userId);
    void deleteByItemIdAndUserId(Long itemId, Long userId);
    long countByItemId(Long itemId);
}
