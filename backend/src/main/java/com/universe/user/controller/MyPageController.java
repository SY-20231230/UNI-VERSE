package com.universe.user.controller;

import com.universe.global.common.ApiResponse;
import com.universe.global.common.PageResponse;
import com.universe.report.service.ReportCurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.universe.market.entity.TradeStatus;
import com.universe.trust.dto.response.TrustHistoryResponse;
import com.universe.user.dto.response.*;
import com.universe.user.service.MyPageService;

@RestController
@RequestMapping("/api/v1/mypage")
@RequiredArgsConstructor
public class MyPageController {
    private final MyPageService myPage;
    private final ReportCurrentUser currentUser;

    @GetMapping
    public ApiResponse<MyPageResponse> summary(Authentication authentication) {
        return ApiResponse.success(myPage.getSummary(currentUser.requireId(authentication)));
    }

    @GetMapping("/posts")
    public ApiResponse<PageResponse<CommunityPostListResponse>> findPosts(Authentication authentication,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(new PageResponse<>(myPage.findPosts(currentUser.requireId(authentication), 
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")))));
    }

    @GetMapping("/market-items")
    public ApiResponse<PageResponse<MarketItemListResponse>> findItems(Authentication authentication,
            @RequestParam(required = false) TradeStatus tradeStatus,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(new PageResponse<>(myPage.findItems(currentUser.requireId(authentication), tradeStatus, 
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")))));
    }

    @GetMapping("/trust-history")
    public ApiResponse<PageResponse<TrustHistoryResponse>> findTrustHistory(Authentication authentication,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(new PageResponse<>(myPage.findTrustHistory(currentUser.requireId(authentication), 
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")))));
    }
}
