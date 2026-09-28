package com.universe.admin.service;

import com.universe.report.service.ModerationException;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.*;

class ReportSuspensionPolicyTest {
    @Test void configuredPeriodIsAppliedFromCurrentTime() {
        LocalDateTime before = LocalDateTime.now().plusDays(3);
        LocalDateTime endAt = new ReportSuspensionPolicy(3).endAt();
        LocalDateTime after = LocalDateTime.now().plusDays(3);
        assertThat(endAt).isBetween(before, after);
    }

    @ParameterizedTest
    @ValueSource(longs = {-1, 0, 3651})
    void rejectsMissingOrUnreasonablePeriod(long days) {
        assertThatThrownBy(() -> new ReportSuspensionPolicy(days).endAt())
                .isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode())
                .isEqualTo(ModerationException.Code.INVALID_SANCTION);
    }
}
