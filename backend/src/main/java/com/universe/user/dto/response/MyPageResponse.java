package com.universe.user.dto.response;

import java.time.LocalDateTime;

/**
 * suspendedFrom/suspendedUntil은 accountStatus가 SUSPENDED일 때만,
 * suspensionReleasedAt은 마지막 일시정지가 끝나 ACTIVE로 돌아온 경우에만 채워진다.
 */
public record MyPageResponse(Long userId, String email, String name, String nickname, String department,
        Long schoolId, String schoolName, boolean schoolVerified, int trustScore,
        long postCount, long marketItemCount, long completedTradeCount,
        String accountStatus, LocalDateTime suspendedFrom, LocalDateTime suspendedUntil,
        LocalDateTime suspensionReleasedAt) {}
