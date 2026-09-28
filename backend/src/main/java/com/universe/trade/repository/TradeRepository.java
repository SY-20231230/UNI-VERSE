package com.universe.trade.repository;

import com.universe.trade.entity.Trade;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TradeRepository extends JpaRepository<Trade, Long> {
    Optional<Trade> findTopByItemIdOrderByCreatedAtDesc(Long itemId);
}
