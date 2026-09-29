package com.universe.report.repository;

import com.universe.community.entity.CommunityPost;
import com.universe.market.entity.MarketItem;
import com.universe.trade.entity.Trade;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/** Read-only references used to validate the subject of a report. */
@Repository
@RequiredArgsConstructor
public class ReportReferenceRepository {
    private final EntityManager entityManager;

    public Optional<Trade> findTrade(Long id) { return Optional.ofNullable(entityManager.find(Trade.class, id)); }
    public Optional<MarketItem> findItem(Long id) { return Optional.ofNullable(entityManager.find(MarketItem.class, id)); }
    public Optional<CommunityPost> findPost(Long id) { return Optional.ofNullable(entityManager.find(CommunityPost.class, id)); }
}
