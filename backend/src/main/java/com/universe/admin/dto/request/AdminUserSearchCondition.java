package com.universe.admin.dto.request;
import com.universe.user.entity.AccountStatus;
import jakarta.validation.constraints.*;
public record AdminUserSearchCondition(@Size(max = 150) String keyword,
        AccountStatus accountStatus, @Positive Long schoolId) {}
