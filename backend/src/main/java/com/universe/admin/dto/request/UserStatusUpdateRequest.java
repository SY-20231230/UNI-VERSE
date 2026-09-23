package com.universe.admin.dto.request;
import com.universe.user.entity.AccountStatus;
import jakarta.validation.constraints.NotNull;
public record UserStatusUpdateRequest(@NotNull AccountStatus accountStatus) {}
