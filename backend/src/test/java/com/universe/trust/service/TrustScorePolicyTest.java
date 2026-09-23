package com.universe.trust.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.assertj.core.api.Assertions.*;
import static com.universe.trust.service.TrustScorePolicy.Mode.*;

class TrustScorePolicyTest {
    private final TrustScorePolicy policy = new TrustScorePolicy();

    @ParameterizedTest
    @CsvSource({"1,50", "4,50", "5,60", "6,70", "7,80", "8,90", "9,91", "18,100", "30,100"})
    void normalMilestones(long trades, int expected) {
        int score = 50;
        for (int i = 1; i <= trades; i++) score = policy.afterSafeTrade(score, i, NORMAL);
        assertThat(score).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"1,50", "5,50", "6,60", "7,70", "8,80", "9,90", "10,91", "19,100", "30,100"})
    void suspensionUsesOptionA(long trades, int expected) {
        int score = 50;
        for (int i = 1; i <= trades; i++) score = policy.afterSafeTrade(score, i, SUSPENSION_RECOVERY);
        assertThat(score).isEqualTo(expected);
    }

    @Test void reportRecoveryHoldsUntilTenThenRestartsNormalProgression() {
        int score = 30;
        for (int i = 1; i < 10; i++) {
            score = policy.afterSafeTrade(score, i, REPORT_RECOVERY);
            assertThat(score).isEqualTo(30);
        }
        score = policy.afterSafeTrade(score, 10, REPORT_RECOVERY);
        assertThat(score).isEqualTo(50);
        for (int i = 1; i <= 5; i++) score = policy.afterSafeTrade(score, i, NORMAL);
        assertThat(score).isEqualTo(60);
    }

    @Test void warningDoesNotResetMilestones() {
        assertThat(policy.afterSafeTrade(policy.afterWarning(90), 9, NORMAL)).isEqualTo(81);
    }

    @ParameterizedTest @CsvSource({"0,0", "5,0", "10,0", "50,40", "100,90"})
    void warningFloor(int before, int expected) { assertThat(policy.afterWarning(before)).isEqualTo(expected); }

    @Test void rejectsInvalidState() {
        assertThatIllegalArgumentException().isThrownBy(() -> policy.afterSafeTrade(-1, 1, NORMAL));
        assertThatIllegalArgumentException().isThrownBy(() -> policy.afterSafeTrade(101, 1, NORMAL));
        assertThatIllegalArgumentException().isThrownBy(() -> policy.afterSafeTrade(50, 0, NORMAL));
        assertThatIllegalArgumentException().isThrownBy(() -> policy.afterSafeTrade(30, 11, REPORT_RECOVERY));
    }
}
