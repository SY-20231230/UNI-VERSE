package com.universe.trust.dto.response;

import com.universe.trust.entity.TrustHistory;
import java.time.LocalDateTime;

public record TrustHistoryResponse(Long trustHistoryId, Long tradeId, Long reportId,
        int beforeScore, int changeAmount, int afterScore, String reason, LocalDateTime createdAt) {
    public static TrustHistoryResponse from(TrustHistory history) {
        return new TrustHistoryResponse(history.getId(),
                history.getTrade() == null ? null : history.getTrade().getId(),
                history.getReport() == null ? null : history.getReport().getId(),
                history.getBeforeScore(), history.getChangeAmount(), history.getAfterScore(),
                history.getReason(), history.getCreatedAt());
    }
}
