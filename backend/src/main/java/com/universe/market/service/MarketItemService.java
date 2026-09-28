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
import java.util.Objects;

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
    private final ApplicationEventPublisher eventPublisher;

    public Page<MarketItemListResponse> searchItems(Long schoolId, String category, String keyword, String sort, Pageable pageable) {
        return itemRepository.searchItems(schoolId, category, keyword, sort, pageable)
                .map(MarketItemListResponse::new);
    }

    public MarketItemDetailResponse getItemDetail(Long itemId, Long userId) {
        MarketItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));
        long sellerTrades = tradeRepository.countCompletedTrades(item.getSeller().getId());
        long likeCount = favoriteRepository.countByItemId(itemId);
        boolean isLiked = false;
        if (userId != null) {
            isLiked = favoriteRepository.existsByItemIdAndUserId(itemId, userId);
        }
        return new MarketItemDetailResponse(item, sellerTrades, likeCount, isLiked);
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
                .purchasePrice(request.getPurchasePrice())
                .listedPrice(request.getListedPrice())
                .build();
                
        // Set safe status since it passed AI
        item.updateAiStatus(com.universe.ai.entity.AiAnalysisResult.SAFE);

        MarketItem savedItem = itemRepository.save(item);
        
        if (request.getImages() != null && !request.getImages().isEmpty()) {
            int order = 0;
            for (String url : request.getImages()) {
                imageRepository.save(MarketItemImage.builder()
                        .item(savedItem)
                        .imageUrl(url)
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
            request.getPurchasePrice()
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
                imageRepository.save(MarketItemImage.builder()
                        .item(item)
                        .imageUrl(url)
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
