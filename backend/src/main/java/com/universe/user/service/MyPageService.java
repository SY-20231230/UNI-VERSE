package com.universe.user.service;

import com.universe.user.dto.response.*;
import com.universe.user.entity.User;
import com.universe.user.repository.*;
import com.universe.report.service.ModerationAccessService;
import com.universe.community.entity.PostStatus;
import com.universe.market.entity.TradeStatus;
import com.universe.trust.dto.response.TrustHistoryResponse;
import com.universe.trust.repository.TrustHistoryRepository;
import com.universe.report.entity.SanctionType;
import com.universe.report.entity.UserSanction;
import com.universe.report.repository.UserSanctionRepository;
import com.universe.user.entity.AccountStatus;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Only my-page reads (정지 기간에도 조회 가능). Does not implement signup, authentication or profile modification. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MyPageService {
    private final ModerationAccessService access;
    private final MyPagePostRepository posts;
    private final MyPageItemRepository items;
    private final MyPageTradeRepository trades;
    private final TrustHistoryRepository histories;
    private final UserSanctionRepository sanctions;

    public MyPageResponse getSummary(Long authenticatedUserId) {
        User user = access.requireReadableUser(authenticatedUserId);
        UserSanction latest = sanctions.findFirstByUserIdAndSanctionTypeOrderByStartAtDescIdDesc(user.getId(), SanctionType.SUSPENSION)
                .orElse(null);
        boolean suspended = user.getAccountStatus() == AccountStatus.SUSPENDED;
        UserSanction suspension = suspended ? latest : null;
        // 정지가 끝나 다시 활성화된 회원에게 "정지 해제" 안내를 띄울 수 있도록 마지막 정지 종료 시각을 준다.
        LocalDateTime releasedAt = !suspended && user.getAccountStatus() == AccountStatus.ACTIVE && latest != null
                && latest.getEndAt() != null && !latest.getEndAt().isAfter(LocalDateTime.now()) ? latest.getEndAt() : null;
        return new MyPageResponse(user.getId(), user.getEmail(), user.getName(), user.getNickname(), user.getDepartment(),
                user.getSchool() == null ? null : user.getSchool().getId(),
                user.getDisplayUniversityName(),
                Boolean.TRUE.equals(user.getSchoolVerified()), user.getTrustScore(),
                posts.countByUserIdAndStatusNot(user.getId(), PostStatus.DELETED),
                items.countBySellerId(user.getId()), trades.countCompleted(user.getId()),
                user.getAccountStatus().name(), suspension == null ? null : suspension.getStartAt(),
                suspension == null ? null : suspension.getEndAt(), releasedAt);
    }

    public Page<CommunityPostListResponse> findPosts(Long authenticatedUserId, Pageable pageable) {
        access.requireReadableUser(authenticatedUserId);
        return posts.findByUserIdAndStatusNot(authenticatedUserId, PostStatus.DELETED, pageable)
                .map(CommunityPostListResponse::from);
    }

    public Page<MarketItemListResponse> findItems(Long authenticatedUserId, TradeStatus status, Pageable pageable) {
        access.requireReadableUser(authenticatedUserId);
        var page = status == null ? items.findBySellerId(authenticatedUserId, pageable)
                : items.findBySellerIdAndTradeStatus(authenticatedUserId, status, pageable);
        return page.map(MarketItemListResponse::from);
    }

    public Page<TrustHistoryResponse> findTrustHistory(Long authenticatedUserId, Pageable pageable) {
        access.requireReadableUser(authenticatedUserId);
        return histories.findByUserId(authenticatedUserId, pageable).map(TrustHistoryResponse::from);
    }

    public Page<MarketItemListResponse> findFavoriteItems(Long authenticatedUserId, Pageable pageable) {
        access.requireReadableUser(authenticatedUserId);
        return items.findFavoriteItemsByUserId(authenticatedUserId, pageable).map(MarketItemListResponse::from);
    }
}
