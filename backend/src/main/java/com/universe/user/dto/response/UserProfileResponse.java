package com.universe.user.dto.response;

import com.universe.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserProfileResponse {
    private Long userId;
    private String name;
    private String nickname;
    private String department;
    private Long schoolId;
    private String schoolName;
    private boolean schoolVerified;
    private int trustScore;
    private long completedTradeCount;
    private long reportCount;
    private boolean suspendedPermanently;
    private java.time.LocalDateTime suspendedUntil;

    public static UserProfileResponse from(User u, long completedTradeCount, long reportCount) {
        return new UserProfileResponse(
            u.getId(),
            u.getName(),
            u.getNickname(),
            u.getDepartment(),
            u.getSchool() == null ? null : u.getSchool().getId(),
            u.getSchool() == null ? null : u.getSchool().getSchoolName(),
            Boolean.TRUE.equals(u.getSchoolVerified()),
            u.getTrustScore(),
            completedTradeCount,
            reportCount,
            u.getAccountStatus() == com.universe.user.entity.AccountStatus.BANNED,
            null // Simplification: we might not need precise suspension time unless it's available
        );
    }
}
