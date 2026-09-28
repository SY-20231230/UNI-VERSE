package com.universe.trade.repository;

import com.universe.trade.entity.Trade;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface TradeRepository extends JpaRepository<Trade, Long> {
    Optional<Trade> findTopByItemIdOrderByCreatedAtDesc(Long itemId);

    @Query("SELECT COUNT(t) FROM Trade t WHERE (t.seller.id = :userId OR t.buyer.id = :userId) AND t.status = 'COMPLETED'")
    long countCompletedTrades(@Param("userId") Long userId);
}
