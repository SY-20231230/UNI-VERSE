package com.universe.trust.repository;

import com.universe.trade.entity.Trade;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface TrustTradeRepository extends Repository<Trade, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Trade t where t.id = :id")
    Optional<Trade> findLockedById(@Param("id") Long id);
}
