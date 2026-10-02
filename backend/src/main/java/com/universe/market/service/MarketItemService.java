package com.universe.market.service;

import com.universe.ai.service.AiRiskService;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.market.dto.MarketItemCreateRequest;
import com.universe.market.dto.MarketItemDetailResponse;
import com.universe.market.dto.MarketItemListResponse;
import com.universe.market.dto.MarketItemUpdateRequest;
import com.universe.market.entity.MarketItem;
import com.universe.market.entity.MarketItemImage;
import com.universe.market.repository.MarketItemRepository;
import com.universe.market.repository.MarketItemImageRepository;
import com.universe.market.repository.ItemFavoriteCount;
import com.universe.file.service.FileService;
import com.universe.notification.event.MarketItemPriceChangedEvent;
import com.universe.trade.repository.TradeRepository;
import com.universe.market.entity.MarketItemFavorite;
import com.universe.market.repository.MarketItemFavoriteRepository;
import com.universe.school.entity.School;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarketItemService {

    private final MarketItemRepository itemRepository;
    private final MarketItemImageRepository imageRepository;
    private final UserRepository userRepository;
    private final TradeRepository tradeRepository;
    private final MarketItemFavoriteRepository favoriteRepository;
    private final AiRiskService aiRiskService;
    private final FileService fileService;

    /** 조회수 중복 방지: "회원:상품" → 마지막으로 센 시각(ms). 새로고침·개발모드 이중 호출로 부풀지 않게 한다. */
    private static final long VIEW_DEDUP_MILLIS = 30 * 60 * 1000L;
    private final java.util.concurrent.ConcurrentHashMap<String, Long> recentViews = new java.util.concurrent.ConcurrentHashMap<>();

    private boolean shouldCountView(Long viewerId, Long itemId) {
        long now = System.currentTimeMillis();
        if (recentViews.size() > 10_000) recentViews.values().removeIf(t -> now - t > VIEW_DEDUP_MILLIS);
        boolean[] counted = {false};
        recentViews.compute(viewerId + ":" + itemId, (k, last) -> {
            if (last != null && now - last < VIEW_DEDUP_MILLIS) return last;
            counted[0] = true;
            return now;
        });
        return counted[0];
    }
    private final ApplicationEventPublisher eventPublisher;
    
    private String extractKey(String url) {
        if (url == null) return null;
        if (url.startsWith("http")) {
            try {
                java.net.URL parsed = new java.net.URL(url);
                String path = parsed.getPath();
                if (path.startsWith("/")) path = path.substring(1);
                return path;
            } catch (Exception e) {
                return url;
            }
        }
        return url;
    }

    public Page<MarketItemListResponse> searchItems(Long schoolId, String category, String keyword, String sort, String status, Pageable pageable) {
        return itemRepository.searchItems(schoolId, category, keyword, sort, status, pageable)
                .map(item -> new MarketItemListResponse(item, fileService));
    }

    public MarketItemDetailResponse getItemDetail(Long itemId) {
        return getItemDetail(itemId, null);
    }

    /** 상세 조회. 같은 사람(판매자 포함)은 30분에 한 번만 조회수를 올린다. */
    @Transactional
    public MarketItemDetailResponse getItemDetail(Long itemId, Long userId) {
        MarketItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));
        if (userId != null && shouldCountView(userId, itemId)) item.increaseViewCount();
        long sellerTrades = tradeRepository.countCompletedTrades(item.getSeller().getId());
        long likeCount = favoriteRepository.countByItemId(itemId);
        boolean isLiked = false;
        if (userId != null) {
            isLiked = favoriteRepository.existsByItemIdAndUserId(itemId, userId);
        }
        return new MarketItemDetailResponse(item, sellerTrades, likeCount, isLiked, fileService);
    }

    @Transactional
    public Long createItem(Long userId, MarketItemCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        
        School school = user.getSchool();
        if (school == null) {
            throw new BusinessException(ErrorCode.SCHOOL_NOT_FOUND);
        }
        
        // AI Risk Analysis (Before creating MarketItem, item is null)
        com.universe.ai.dto.response.AiRiskResponse riskResponse = aiRiskService.analyzeAndSave(request.getTitle(), request.getDescription(), user, null);
        if (riskResponse.getResult() == com.universe.ai.entity.AiAnalysisResult.FRAUD_SUSPECTED) {
            String msg = riskResponse.getMessage() != null ? riskResponse.getMessage() : "위험문구가 포함되어 있습니다.";
            throw new BusinessException(ErrorCode.FRAUD_SUSPECTED, msg);
        }

        MarketItem item = MarketItem.builder()
                .seller(user)
                .school(school)
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .itemCondition(request.getCondition())
                .purchasePrice(request.getPurchasePrice() != null ? request.getPurchasePrice() : 0L)
                .listedPrice(request.getListedPrice())
                .build();
                
        // Set safe status since it passed AI
        item.updateAiStatus(com.universe.ai.entity.AiAnalysisResult.SAFE);

        MarketItem savedItem = itemRepository.save(item);
        
        if (request.getImages() != null && !request.getImages().isEmpty()) {
            int order = 0;
            for (String url : request.getImages()) {
                String keyToSave = extractKey(url);
                imageRepository.save(MarketItemImage.builder()
                        .item(savedItem)
                        .imageUrl(keyToSave)
                        .imageOrder(order++)
                        .build());
            }
        }
        
        return savedItem.getId();
    }

    @Transactional
    public void updateItem(Long userId, Long itemId, MarketItemUpdateRequest request) {
        MarketItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));
                
        if (!item.isSeller(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // Re-analyze on update (using new title and description)
        com.universe.ai.dto.response.AiRiskResponse riskResponse = aiRiskService.analyzeAndSave(request.getTitle(), request.getDescription(), item.getSeller(), item);
        if (riskResponse.getResult() == com.universe.ai.entity.AiAnalysisResult.FRAUD_SUSPECTED) {
            String msg = riskResponse.getMessage() != null ? riskResponse.getMessage() : "위험문구가 포함되어 있습니다.";
            throw new BusinessException(ErrorCode.FRAUD_SUSPECTED, msg);
        }

        Long oldListedPrice = item.getListedPrice();
        item.updateContent(
            request.getTitle(),
            request.getDescription(),
            request.getCategory(),
            request.getCondition(),
            request.getListedPrice(),
            request.getPurchasePrice() != null ? request.getPurchasePrice() : 0L
        );
        
        item.updateAiStatus(com.universe.ai.entity.AiAnalysisResult.SAFE);

        if (!java.util.Objects.equals(oldListedPrice, item.getListedPrice())) {
            eventPublisher.publishEvent(new MarketItemPriceChangedEvent(item.getId(), item.getTitle(),
                    oldListedPrice, item.getListedPrice(), userId));
        }

        // Handle image updates
        List<MarketItemImage> existingImages = imageRepository.findByItemIdOrderByImageOrderAsc(item.getId());
        imageRepository.deleteAll(existingImages);

        if (request.getImages() != null && !request.getImages().isEmpty()) {
            int order = 0;
            for (String url : request.getImages()) {
                String keyToSave = extractKey(url);
                imageRepository.save(MarketItemImage.builder()
                        .item(item)
                        .imageUrl(keyToSave)
                        .imageOrder(order++)
                        .build());
            }
        }
    }

    @Transactional
    public void deleteItem(Long userId, Long itemId) {
        MarketItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));
                
        if (!item.isSeller(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        
        itemRepository.delete(item);
    }

    @Transactional
    public void favoriteItem(Long userId, Long itemId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        MarketItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));

        if (!favoriteRepository.existsByItemIdAndUserId(itemId, userId)) {
            favoriteRepository.save(new MarketItemFavorite(item, user));
        }
    }

    @Transactional
    public void unfavoriteItem(Long userId, Long itemId) {
        favoriteRepository.deleteByItemIdAndUserId(itemId, userId);
    }
}
