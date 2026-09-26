package com.universe.notification.event;

import com.universe.report.entity.SanctionType;

import java.time.LocalDateTime;

public record SanctionImposedEvent(Long sanctionId, Long userId, SanctionType sanctionType, LocalDateTime endAt) {
}
