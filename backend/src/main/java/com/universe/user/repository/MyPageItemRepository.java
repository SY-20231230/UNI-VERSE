package com.universe.user.repository;
import com.universe.market.entity.*;
import org.springframework.data.domain.*;
import org.springframework.data.repository.Repository;
public interface MyPageItemRepository extends Repository<MarketItem, Long> {
    Page<MarketItem> findBySellerId(Long userId, Pageable pageable);
    Page<MarketItem> findBySellerIdAndTradeStatus(Long userId, TradeStatus status, Pageable pageable);
    long countBySellerId(Long userId);
}
