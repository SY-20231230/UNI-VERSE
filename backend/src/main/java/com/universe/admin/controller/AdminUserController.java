package com.universe.admin.controller;

import com.universe.global.common.ApiResponse;
import com.universe.global.common.PageResponse;
import com.universe.report.service.ReportCurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.universe.admin.dto.request.*;
import com.universe.admin.dto.response.*;
import com.universe.admin.service.AdminUserService;
import com.universe.admin.service.AdminSanctionService;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {
    private final AdminUserService users;
    private final AdminSanctionService sanctions;
    private final ReportCurrentUser currentUser;

    @GetMapping
    public ApiResponse<PageResponse<AdminUserListResponse>> search(Authentication authentication,
            @Valid @ModelAttribute AdminUserSearchCondition condition,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(new PageResponse<>(users.search(currentUser.requireId(authentication), condition,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")))));
    }

    @GetMapping("/{userId}")
    public ApiResponse<AdminUserDetailResponse> detail(Authentication authentication,
            @PathVariable @Positive Long userId) {
        return ApiResponse.success(users.getDetail(currentUser.requireId(authentication), userId));
    }

    @PostMapping("/{userId}/sanctions")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserSanctionResponse> createSanction(Authentication authentication,
            @PathVariable @Positive Long userId, @Valid @RequestBody UserSanctionCreateRequest request) {
        return ApiResponse.success(sanctions.create(currentUser.requireId(authentication), userId, request));
    }

    @PatchMapping("/{userId}/status")
    public ApiResponse<AdminUserResponse> updateStatus(Authentication authentication,
            @PathVariable @Positive Long userId, @Valid @RequestBody UserStatusUpdateRequest request) {
        return ApiResponse.success(users.updateStatus(currentUser.requireId(authentication), userId, request));
    }

    @GetMapping("/{userId}/sanctions")
    public ApiResponse<PageResponse<UserSanctionResponse>> findSanctions(Authentication authentication,
            @PathVariable @Positive Long userId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(new PageResponse<>(users.findSanctions(currentUser.requireId(authentication), userId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")))));
    }
}
