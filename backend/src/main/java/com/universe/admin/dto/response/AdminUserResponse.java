package com.universe.admin.dto.response;
import com.universe.user.entity.*;
public record AdminUserResponse(Long userId, String email, String name, String nickname,
        Long schoolId, boolean schoolVerified, UserRole role, AccountStatus accountStatus, int trustScore) {
    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(user.getId(), user.getEmail(), user.getName(), user.getNickname(),
                user.getSchool() == null ? null : user.getSchool().getId(),
                Boolean.TRUE.equals(user.getSchoolVerified()), user.getRole(), user.getAccountStatus(), user.getTrustScore());
    }
}
