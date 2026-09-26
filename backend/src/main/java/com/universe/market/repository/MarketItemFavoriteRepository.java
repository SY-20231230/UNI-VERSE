package com.universe.market.repository;

import com.universe.market.entity.MarketItemFavorite;
import com.universe.market.entity.MarketItemFavoriteId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MarketItemFavoriteRepository extends JpaRepository<MarketItemFavorite, MarketItemFavoriteId> {
    boolean existsByItemIdAndUserId(Long itemId, Long userId);
    void deleteByItemIdAndUserId(Long itemId, Long userId);
    long countByItemId(Long itemId);

    @Query("select f.user.id from MarketItemFavorite f where f.item.id = :itemId")
    List<Long> findUserIdsByItemId(@Param("itemId") Long itemId);
}
