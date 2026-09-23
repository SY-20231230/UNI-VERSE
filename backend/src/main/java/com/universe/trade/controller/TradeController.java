package com.universe.trade.controller;

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
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;

    @PostMapping
    public ResponseEntity<Void> proposeTrade(@Valid @RequestBody TradeCreateRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        Long tradeId = tradeService.proposeTrade(userId, request);
        return ResponseEntity.created(URI.create("/api/trades/" + tradeId)).build();
    }

    @GetMapping("/{tradeId}")
    public ResponseEntity<TradeResponse> getTradeDetail(@PathVariable Long tradeId) {
        Long userId = SecurityUtil.getCurrentUserId();
        return ResponseEntity.ok(tradeService.getTradeDetail(userId, tradeId));
    }

    @PostMapping("/{tradeId}/confirm")
    public ResponseEntity<Void> confirmTrade(@PathVariable Long tradeId) {
        Long userId = SecurityUtil.getCurrentUserId();
        tradeService.confirmTrade(userId, tradeId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{tradeId}/cancel")
    public ResponseEntity<Void> cancelTrade(@PathVariable Long tradeId) {
        Long userId = SecurityUtil.getCurrentUserId();
        tradeService.cancelTrade(userId, tradeId);
        return ResponseEntity.ok().build();
    }
}
