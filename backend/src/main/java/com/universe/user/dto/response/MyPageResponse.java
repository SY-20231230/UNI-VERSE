package com.universe.user.dto.response;

public record MyPageResponse(Long userId, String email, String name, String nickname,
        Long schoolId, String schoolName, boolean schoolVerified, int trustScore,
        long postCount, long marketItemCount, long completedTradeCount) {}
