package com.universe.trust.service;

import org.springframework.stereotype.Component;

@Component
public class TrustScorePolicy {
    public static final int DEFAULT_SCORE = 50;
    public static final int REPORT_SCORE = 30;
    public enum Mode { NORMAL, REPORT_RECOVERY, SUSPENSION_RECOVERY }

    public int afterSafeTrade(int currentScore, long completedCount, Mode mode) {
        if (currentScore < 0 || currentScore > 100 || completedCount < 1 || mode == null)
            throw new IllegalArgumentException("Invalid trust score state");
        if (mode == Mode.REPORT_RECOVERY) {
            if (completedCount > 10) throw new IllegalArgumentException("Report recovery must reset after ten trades");
            return completedCount == 10 ? DEFAULT_SCORE : currentScore;
        }
        long firstBonus = mode == Mode.NORMAL ? 5 : 6;
        int delta = completedCount < firstBonus ? 0 : completedCount < firstBonus + 4 ? 10 : 1;
        return Math.min(100, currentScore + delta);
    }

    public int afterWarning(int currentScore) {
        if (currentScore < 0 || currentScore > 100) throw new IllegalArgumentException("Invalid trust score");
        return Math.max(0, currentScore - 10);
    }
}
