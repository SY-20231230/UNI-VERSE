package com.universe.market.repository;

import com.universe.market.entity.MarketItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MarketItemRepositoryCustom {
    Page<MarketItem> searchItems(Long schoolId, String category, String keyword, String sort, Pageable pageable);
}
