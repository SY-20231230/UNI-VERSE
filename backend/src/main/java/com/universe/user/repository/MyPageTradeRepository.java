package com.universe.user.repository;
import com.universe.trade.entity.Trade;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
public interface MyPageTradeRepository extends Repository<Trade, Long> {
    @Query("""
        select count(t) from Trade t where (t.seller.id = :userId or t.buyer.id = :userId)
        and t.status = com.universe.market.entity.TradeStatus.COMPLETED
        and t.sellerConfirmed = true and t.buyerConfirmed = true and t.completedAt is not null
        """)
    long countCompleted(@Param("userId") Long userId);
}
