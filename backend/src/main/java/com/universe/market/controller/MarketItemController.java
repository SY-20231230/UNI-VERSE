package com.universe.market.controller;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.global.util.SecurityUtil;
import com.universe.market.dto.MarketItemCreateRequest;
import com.universe.market.dto.MarketItemDetailResponse;
import com.universe.market.dto.MarketItemListResponse;
import com.universe.market.dto.MarketItemUpdateRequest;
import com.universe.market.service.MarketItemService;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketItemController {

    private final MarketItemService marketItemService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Page<MarketItemListResponse>> searchItems(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sort,
            Pageable pageable) {
        
        Long userId = SecurityUtil.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        
        if (user.getSchool() == null) {
            throw new BusinessException(ErrorCode.SCHOOL_NOT_FOUND);
        }
        
        Long schoolId = user.getSchool().getId();
        
        return ResponseEntity.ok(marketItemService.searchItems(schoolId, category, keyword, sort, pageable));
    }

    @GetMapping("/{itemId}")
    public ResponseEntity<MarketItemDetailResponse> getItemDetail(@PathVariable Long itemId) {
        return ResponseEntity.ok(marketItemService.getItemDetail(itemId));
    }

    @PostMapping
    public ResponseEntity<Void> createItem(@Valid @RequestBody MarketItemCreateRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        Long itemId = marketItemService.createItem(userId, request);
        return ResponseEntity.created(URI.create("/api/market/" + itemId)).build();
    }

    @PutMapping("/{itemId}")
    public ResponseEntity<Void> updateItem(@PathVariable Long itemId, @Valid @RequestBody MarketItemUpdateRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        marketItemService.updateItem(userId, itemId, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long itemId) {
        Long userId = SecurityUtil.getCurrentUserId();
        marketItemService.deleteItem(userId, itemId);
        return ResponseEntity.noContent().build();
    }
}
