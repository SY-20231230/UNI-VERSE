package com.universe.market.controller;

import com.universe.global.util.SecurityUtil;
import com.universe.market.service.MarketItemFavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketItemFavoriteController {

    private final MarketItemFavoriteService favoriteService;

    @PostMapping("/{itemId}/favorite")
    public ResponseEntity<Void> toggleFavorite(@PathVariable Long itemId) {
        Long userId = SecurityUtil.getCurrentUserId();
        favoriteService.toggleFavorite(itemId, userId);
        return ResponseEntity.ok().build();
    }
}
