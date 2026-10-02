package com.universe.community.controller;

import com.universe.community.dto.response.CommentLikeResponse;
import com.universe.community.service.CommentLikeService;
import com.universe.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class CommentLikeController {
    private final CommentLikeService service;

    @PostMapping("/api/v1/community/comments/{commentId}/likes")
    public ApiResponse<CommentLikeResponse> like(@PathVariable Long commentId) {
        return ApiResponse.success(service.like(commentId));
    }

    @DeleteMapping("/api/v1/community/comments/{commentId}/likes")
    public ApiResponse<CommentLikeResponse> unlike(@PathVariable Long commentId) {
        return ApiResponse.success(service.unlike(commentId));
    }
}
