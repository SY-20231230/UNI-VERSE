package com.universe.admin.repository;
import com.universe.trade.entity.Trade;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
public interface AdminActivityRepository extends Repository<Trade, Long> {
    @Query("select t from Trade t where t.seller.id = :userId or t.buyer.id = :userId")
    Page<Trade> findByParticipant(@Param("userId") Long userId, Pageable pageable);
}
