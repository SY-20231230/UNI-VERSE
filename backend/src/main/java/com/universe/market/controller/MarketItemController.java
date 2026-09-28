package com.universe.market.controller;

import com.universe.global.common.ApiResponse;
import com.universe.global.common.PageResponse;
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
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/market")
@RequiredArgsConstructor
public class MarketItemController {

    private final MarketItemService marketItemService;
    private final UserRepository userRepository;

    @GetMapping
    public ApiResponse<PageResponse<MarketItemListResponse>> searchItems(
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
        Page<MarketItemListResponse> page = marketItemService.searchItems(schoolId, category, keyword, sort, pageable);
        return ApiResponse.success(new PageResponse<>(page));
    }

    @GetMapping("/{itemId}")
    public ApiResponse<MarketItemDetailResponse> getItemDetail(@PathVariable Long itemId) {
        return ApiResponse.success(marketItemService.getItemDetail(itemId));
    }

    @PostMapping
    public ApiResponse<Map<String, Long>> createItem(@Valid @RequestBody MarketItemCreateRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        Long itemId = marketItemService.createItem(userId, request);
        return ApiResponse.success(Map.of("itemId", itemId));
    }

    @PutMapping("/{itemId}")
    public ApiResponse<Void> updateItem(@PathVariable Long itemId, @Valid @RequestBody MarketItemUpdateRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        marketItemService.updateItem(userId, itemId, request);
        return ApiResponse.success();
    }

    @DeleteMapping("/{itemId}")
    public ApiResponse<Void> deleteItem(@PathVariable Long itemId) {
        Long userId = SecurityUtil.getCurrentUserId();
        marketItemService.deleteItem(userId, itemId);
        return ApiResponse.success();
    }
}
