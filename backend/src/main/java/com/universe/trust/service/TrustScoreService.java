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

    public void confirmReport(Report report) {
        if (report.getStatus() != ReportStatus.PROCESSED) throw new ModerationException(REPORT_ALREADY_PROCESSED);
        User user = lockUser(report.getTargetUser().getId());
        if (!histories.existsByUserIdAndReportIdAndReason(user.getId(), report.getId(), "REPORT_CONFIRMED"))
            record(user, null, report, 30, "REPORT_CONFIRMED");
    }

    public void applyWarning(UserSanction sanction) {
        if (sanction.getId() == null || sanction.getSanctionType() != SanctionType.WARNING)
            throw new ModerationException(INVALID_SANCTION);
        User user = lockUser(sanction.getUser().getId());
        String reason = "WARNING:" + sanction.getId();
        if (sanction.getReport() != null && histories.existsByUserIdAndReportIdAndReason(
                user.getId(), sanction.getReport().getId(), "REPORT_CONFIRMED")) return;
        if (!histories.existsByUserIdAndReason(user.getId(), reason))
            record(user, null, sanction.getReport(), policy.afterWarning(user.getTrustScore()), reason);
    }

    public void releaseSuspension(UserSanction sanction, LocalDateTime releasedAt) {
        if (sanction.getId() == null || sanction.getSanctionType() != SanctionType.SUSPENSION
                || sanction.getEndAt() == null || sanction.getEndAt().isAfter(releasedAt))
            throw new ModerationException(INVALID_SANCTION);
        User user = lockUser(sanction.getUser().getId());
        if (user.getAccountStatus() != AccountStatus.ACTIVE) throw new ModerationException(INVALID_ACCOUNT_TRANSITION);
        String reason = "SUSPENSION_RELEASED:" + sanction.getId();
        if (!histories.existsByUserIdAndReason(user.getId(), reason)) record(user, null, sanction.getReport(), 50, reason);
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
