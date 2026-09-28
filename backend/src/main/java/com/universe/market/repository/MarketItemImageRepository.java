package com.universe.market.repository;

import com.universe.market.entity.MarketItemImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MarketItemImageRepository extends JpaRepository<MarketItemImage, Long> {
    List<MarketItemImage> findByItemIdOrderByImageOrderAsc(Long itemId);
}
