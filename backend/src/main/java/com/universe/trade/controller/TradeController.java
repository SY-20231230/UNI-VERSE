package com.universe.trade.controller;

import com.universe.global.common.ApiResponse;
import com.universe.global.util.SecurityUtil;
import com.universe.trade.dto.TradeCreateRequest;
import com.universe.trade.dto.TradeResponse;
import com.universe.trade.service.TradeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;

    @PostMapping
    public ResponseEntity<ApiResponse<Long>> proposeTrade(@Valid @RequestBody TradeCreateRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        Long tradeId = tradeService.proposeTrade(userId, request);
        return ResponseEntity.created(URI.create("/api/v1/trades/" + tradeId)).body(ApiResponse.success(tradeId));
    }

    @GetMapping("/{tradeId}")
    public ApiResponse<TradeResponse> getTradeDetail(@PathVariable Long tradeId) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ApiResponse.success(tradeService.getTradeDetail(userId, tradeId));
    }

    @GetMapping("/item/{itemId}")
    public ApiResponse<TradeResponse> getTradeByItem(@PathVariable Long itemId) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ApiResponse.success(tradeService.getTradeByItem(userId, itemId));
    }

    @PostMapping("/{tradeId}/accept")
    public ApiResponse<Void> acceptTrade(@PathVariable Long tradeId) {
        Long userId = SecurityUtil.getCurrentUserId();
        tradeService.acceptTrade(userId, tradeId);
        return ApiResponse.success();
    }

    @PostMapping("/{tradeId}/confirm")
    public ApiResponse<Void> confirmTrade(@PathVariable Long tradeId) {
        Long userId = SecurityUtil.getCurrentUserId();
        tradeService.confirmTrade(userId, tradeId);
        return ApiResponse.success();
    }

    @PostMapping("/{tradeId}/cancel")
    public ApiResponse<Void> cancelTrade(@PathVariable Long tradeId) {
        Long userId = SecurityUtil.getCurrentUserId();
        tradeService.cancelTrade(userId, tradeId);
        return ApiResponse.success();
    }
}
