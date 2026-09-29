package com.universe.market.repository;

import com.universe.market.entity.MarketItemFavorite;
import com.universe.market.entity.MarketItemFavoriteId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MarketItemFavoriteRepository extends JpaRepository<MarketItemFavorite, MarketItemFavoriteId> {
    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM MarketItemFavorite f WHERE f.item.id = :itemId AND f.user.id = :userId")
    boolean existsByItemIdAndUserId(@Param("itemId") Long itemId, @Param("userId") Long userId);
    void deleteByItemIdAndUserId(Long itemId, Long userId);
    long countByItemId(Long itemId);

    @Query("select new com.universe.market.repository.ItemFavoriteCount(f.item.id, count(f)) " +
            "from MarketItemFavorite f where f.item.id in :itemIds group by f.item.id")
    List<ItemFavoriteCount> countByItemIds(@Param("itemIds") List<Long> itemIds);

    @Query("select f.user.id from MarketItemFavorite f where f.item.id = :itemId")
    List<Long> findUserIdsByItemId(@Param("itemId") Long itemId);
}
