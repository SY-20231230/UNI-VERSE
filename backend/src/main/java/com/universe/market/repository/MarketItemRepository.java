package com.universe.market.repository;

import com.universe.market.entity.MarketItem;
import org.springframework.data.jpa.repository.JpaRepository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface MarketItemRepository extends JpaRepository<MarketItem, Long>, MarketItemRepositoryCustom {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MarketItem m WHERE m.id = :id")
    Optional<MarketItem> findByIdForUpdate(@Param("id") Long id);
}
