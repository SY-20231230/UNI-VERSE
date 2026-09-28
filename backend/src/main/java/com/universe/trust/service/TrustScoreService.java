package com.universe.trust.service;

import com.universe.trust.entity.TrustHistory;
import com.universe.trust.repository.*;
import com.universe.report.entity.*;
import com.universe.report.repository.ModerationUserRepository;
import com.universe.report.service.ModerationException;
import com.universe.trade.entity.Trade;
import com.universe.market.entity.TradeStatus;
import com.universe.user.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import static com.universe.report.service.ModerationException.Code.*;
import static com.universe.trust.service.TrustScorePolicy.Mode.*;

/** Internal integration service. Caller must use the same transaction as signup/trade/moderation. */
@Service
@RequiredArgsConstructor
@Transactional
public class TrustScoreService {
    private final ModerationUserRepository users;
    private final TrustHistoryRepository histories;
    private final TrustTradeRepository trades;
    private final TrustScorePolicy policy;

    public void initializeNewUser(Long userId) {
        User user = lockUser(userId);
        if (histories.existsByUserId(userId)) return;
        if (user.getTrustScore() != 0 && user.getTrustScore() != 50)
            throw new ModerationException(INVALID_SCORE_STATE);
        record(user, null, null, 50, "INITIALIZED");
    }

    /** 신고 확정 자체로는 점수를 바꾸지 않는다. 점수는 함께 부과한 제재(경고·정지·영구정지)에 따라서만 깎인다. */
    public void confirmReport(Report report) {
        if (report.getStatus() != ReportStatus.PROCESSED) throw new ModerationException(REPORT_ALREADY_PROCESSED);
    }

    public void applyWarning(UserSanction sanction) {
        if (sanction.getId() == null || sanction.getSanctionType() != SanctionType.WARNING)
            throw new ModerationException(INVALID_SANCTION);
        User user = lockUser(sanction.getUser().getId());
        String reason = "WARNING:" + sanction.getId();
        if (!histories.existsByUserIdAndReason(user.getId(), reason))
            record(user, null, sanction.getReport(), policy.afterWarning(user.getTrustScore()), reason);
    }

    public void applySuspension(UserSanction sanction) {
        if (sanction.getId() == null || sanction.getSanctionType() != SanctionType.SUSPENSION
                || sanction.getStartAt() == null || sanction.getEndAt() == null)
            throw new ModerationException(INVALID_SANCTION);
        User user = lockUser(sanction.getUser().getId());
        String reason = "SUSPENSION:" + sanction.getId();
        if (!histories.existsByUserIdAndReason(user.getId(), reason))
            record(user, null, sanction.getReport(), policy.afterSuspension(user.getTrustScore(), suspensionDays(sanction)), reason);
    }

    public void applyBan(UserSanction sanction) {
        if (sanction.getId() == null || sanction.getSanctionType() != SanctionType.BAN)
            throw new ModerationException(INVALID_SANCTION);
        User user = lockUser(sanction.getUser().getId());
        String reason = "BAN:" + sanction.getId();
        if (!histories.existsByUserIdAndReason(user.getId(), reason)) record(user, null, sanction.getReport(), 0, reason);
    }

    /** 정지 기간(일). 요청 처리 중 몇 초 차이는 반올림으로 흡수한다. */
    static long suspensionDays(UserSanction sanction) {
        long minutes = java.time.Duration.between(sanction.getStartAt(), sanction.getEndAt()).toMinutes();
        return Math.max(1, Math.round(minutes / 1440.0));
    }

    public void releaseSuspension(UserSanction sanction, LocalDateTime releasedAt) {
        if (sanction.getId() == null || sanction.getSanctionType() != SanctionType.SUSPENSION
                || sanction.getEndAt() == null || sanction.getEndAt().isAfter(releasedAt))
            throw new ModerationException(INVALID_SANCTION);
        User user = lockUser(sanction.getUser().getId());
        if (user.getAccountStatus() != AccountStatus.ACTIVE) throw new ModerationException(INVALID_ACCOUNT_TRANSITION);
        String reason = "SUSPENSION_RELEASED:" + sanction.getId();
        // 정지가 끝나도 깎인 점수는 복구하지 않는다. 이력만 남겨 이후 거래 보너스 계산의 기준점으로 쓴다.
        if (!histories.existsByUserIdAndReason(user.getId(), reason))
            record(user, null, sanction.getReport(), user.getTrustScore(), reason);
    }

    public void recordCompletedTrade(Long tradeId) {
        Trade trade = trades.findLockedById(tradeId).orElseThrow(() -> new ModerationException(REFERENCE_NOT_FOUND));
        if (trade.getStatus() != TradeStatus.COMPLETED || !Boolean.TRUE.equals(trade.getSellerConfirmed())
                || !Boolean.TRUE.equals(trade.getBuyerConfirmed()) || trade.getCompletedAt() == null)
            throw new ModerationException(TRADE_NOT_COMPLETED);
        if (Objects.equals(trade.getSeller().getId(), trade.getBuyer().getId()))
            throw new ModerationException(INVALID_REPORT_TARGET);
        List<Long> ids = new ArrayList<>(List.of(trade.getSeller().getId(), trade.getBuyer().getId()));
        ids.sort(Long::compareTo);
        for (Long id : ids) creditTrade(lockUser(id), trade);
    }

    private void creditTrade(User user, Trade trade) {
        if (histories.existsByUserIdAndTradeId(user.getId(), trade.getId())) return;
        if (user.getAccountStatus() != AccountStatus.ACTIVE) throw new ModerationException(FORBIDDEN);
        List<TrustHistory> anchors = histories.findLatestAnchor(user.getId(), PageRequest.of(0, 1));
        if (anchors.isEmpty()) throw new ModerationException(SCORE_NOT_INITIALIZED);
        TrustHistory anchor = anchors.getFirst();
        // Late delivery of an old completion must not advance a new recovery period.
        if (anchor.getCreatedAt() != null && trade.getCompletedAt().isBefore(anchor.getCreatedAt())) return;
        var mode = anchor.getReason().equals("REPORT_CONFIRMED") ? REPORT_RECOVERY
                : anchor.getReason().startsWith("SUSPENSION_RELEASED:") ? SUSPENSION_RECOVERY : NORMAL;
        var latest = histories.findLatestSafeTradeAfter(user.getId(), anchor.getId(), PageRequest.of(0, 1));
        long count = latest.isEmpty() ? 1 : Long.parseLong(latest.getFirst().getReason().substring("SAFE_TRADE:".length())) + 1;
        int score = policy.afterSafeTrade(user.getTrustScore(), count, mode);
        record(user, trade, null, score, mode == REPORT_RECOVERY && count == 10 ? "REPORT_RECOVERED" : "SAFE_TRADE:" + count);
    }

    private User lockUser(Long id) {
        return users.findLockedById(id).orElseThrow(() -> new ModerationException(USER_NOT_FOUND));
    }

    private void record(User user, Trade trade, Report report, int score, String reason) {
        int before = user.getTrustScore();
        if (score < 0 || score > 100) throw new ModerationException(INVALID_SCORE_STATE);
        user.addTrustScore(score - before);
        histories.save(TrustHistory.builder().user(user).trade(trade).report(report).beforeScore(before)
                .changeAmount(score - before).afterScore(score).reason(reason).build());
    }
}
