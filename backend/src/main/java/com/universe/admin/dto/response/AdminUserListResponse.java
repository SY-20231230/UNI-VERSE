package com.universe.admin.dto.response;

import com.universe.user.entity.AccountStatus;
import com.universe.user.entity.UserRole;

public record AdminUserListResponse(Long userId, String email, String name, String nickname,
        Long schoolId, boolean schoolVerified, UserRole role, AccountStatus accountStatus, int trustScore) {}
