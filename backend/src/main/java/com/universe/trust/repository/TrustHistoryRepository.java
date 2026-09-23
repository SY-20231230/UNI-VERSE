package com.universe.trust.repository;

import com.universe.trust.entity.TrustHistory;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TrustHistoryRepository extends JpaRepository<TrustHistory, Long> {
    Page<TrustHistory> findByUserId(Long userId, Pageable pageable);

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    List<TrustHistory> findAllByUserId(Long userId, Pageable pageable);
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    List<TrustHistory> findByUserIdAndTradeId(Long userId, Long tradeId);
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    List<TrustHistory> findByUserIdAndReportIdAndReason(Long userId, Long reportId, String reason);
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    List<TrustHistory> findByUserIdAndReason(Long userId, String reason);

    default boolean existsByUserId(Long userId) { return !findAllByUserId(userId, PageRequest.of(0, 1)).isEmpty(); }
    default boolean existsByUserIdAndTradeId(Long userId, Long tradeId) { return !findByUserIdAndTradeId(userId, tradeId).isEmpty(); }
    default boolean existsByUserIdAndReportIdAndReason(Long userId, Long reportId, String reason) {
        return !findByUserIdAndReportIdAndReason(userId, reportId, reason).isEmpty();
    }
    default boolean existsByUserIdAndReason(Long userId, String reason) { return !findByUserIdAndReason(userId, reason).isEmpty(); }

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select h from TrustHistory h where h.user.id = :userId
        and (h.reason in ('INITIALIZED', 'REPORT_CONFIRMED', 'REPORT_RECOVERED')
             or h.reason like 'SUSPENSION_RELEASED:%') order by h.id desc
        """)
    List<TrustHistory> findLatestAnchor(@Param("userId") Long userId, Pageable pageable);

    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select h from TrustHistory h where h.user.id = :userId
        and h.id > :anchorId and h.reason like 'SAFE_TRADE:%' order by h.id desc
        """)
    List<TrustHistory> findLatestSafeTradeAfter(@Param("userId") Long userId, @Param("anchorId") Long anchorId, Pageable pageable);
}
