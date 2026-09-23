package com.universe.user.service;

import com.universe.user.dto.response.*;
import com.universe.user.entity.User;
import com.universe.user.repository.*;
import com.universe.report.service.ModerationAccessService;
import com.universe.community.entity.PostStatus;
import com.universe.market.entity.TradeStatus;
import com.universe.trust.dto.response.TrustHistoryResponse;
import com.universe.trust.repository.TrustHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Only my-page reads. Does not implement signup, authentication or profile modification. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MyPageService {
    private final ModerationAccessService access;
    private final MyPagePostRepository posts;
    private final MyPageItemRepository items;
    private final MyPageTradeRepository trades;
    private final TrustHistoryRepository histories;

    public MyPageResponse getSummary(Long authenticatedUserId) {
        User user = access.requireActiveUser(authenticatedUserId);
        return new MyPageResponse(user.getId(), user.getEmail(), user.getName(), user.getNickname(),
                user.getSchool() == null ? null : user.getSchool().getId(),
                user.getSchool() == null ? null : user.getSchool().getSchoolName(),
                Boolean.TRUE.equals(user.getSchoolVerified()), user.getTrustScore(),
                posts.countByUserIdAndStatusNot(user.getId(), PostStatus.DELETED),
                items.countBySellerId(user.getId()), trades.countCompleted(user.getId()));
    }

    public Page<CommunityPostListResponse> findPosts(Long authenticatedUserId, Pageable pageable) {
        access.requireActiveUser(authenticatedUserId);
        return posts.findByUserIdAndStatusNot(authenticatedUserId, PostStatus.DELETED, pageable)
                .map(CommunityPostListResponse::from);
    }

    public Page<MarketItemListResponse> findItems(Long authenticatedUserId, TradeStatus status, Pageable pageable) {
        access.requireActiveUser(authenticatedUserId);
        var page = status == null ? items.findBySellerId(authenticatedUserId, pageable)
                : items.findBySellerIdAndTradeStatus(authenticatedUserId, status, pageable);
        return page.map(MarketItemListResponse::from);
    }

    public Page<TrustHistoryResponse> findTrustHistory(Long authenticatedUserId, Pageable pageable) {
        access.requireActiveUser(authenticatedUserId);
        return histories.findByUserId(authenticatedUserId, pageable).map(TrustHistoryResponse::from);
    }
}
