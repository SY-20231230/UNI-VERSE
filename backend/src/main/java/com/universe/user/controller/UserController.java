package com.universe.user.controller;

import com.universe.global.common.ApiResponse;
import com.universe.user.dto.request.UpdateUserRequest;
import com.universe.user.dto.response.UserResponse;
import com.universe.user.dto.response.UserProfileResponse;
import com.universe.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService service;

    @GetMapping("/me")
    public ApiResponse<UserResponse> me() {
        return ApiResponse.success(service.me());
    }

    @GetMapping("/{userId}/profile")
    public ApiResponse<UserProfileResponse> profile(@PathVariable Long userId) {
        return ApiResponse.success(service.getProfile(userId));
    }

    @PatchMapping("/me")
    public ApiResponse<UserResponse> update(@Valid @RequestBody UpdateUserRequest r) {
        return ApiResponse.success(service.update(r));
    }

    @DeleteMapping("/me")
    public ApiResponse<Void> delete() {
        service.delete();
        return ApiResponse.success();
    }
}
