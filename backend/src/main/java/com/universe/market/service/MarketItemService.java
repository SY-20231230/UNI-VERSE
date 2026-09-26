package com.universe.market.service;

import com.universe.ai.service.AiRiskService;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.market.dto.MarketItemCreateRequest;
import com.universe.market.dto.MarketItemDetailResponse;
import com.universe.market.dto.MarketItemListResponse;
import com.universe.market.dto.MarketItemUpdateRequest;
import com.universe.market.entity.MarketItem;
import com.universe.market.repository.MarketItemRepository;
import com.universe.notification.event.MarketItemPriceChangedEvent;
import com.universe.school.entity.School;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarketItemService {

    private final MarketItemRepository itemRepository;
    private final UserRepository userRepository;
    private final AiRiskService aiRiskService;
    private final ApplicationEventPublisher eventPublisher;

    public Page<MarketItemListResponse> searchItems(Long schoolId, String category, String keyword, String sort, Pageable pageable) {
        return itemRepository.searchItems(schoolId, category, keyword, sort, pageable)
                .map(MarketItemListResponse::new);
    }

    public MarketItemDetailResponse getItemDetail(Long itemId) {
        MarketItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));
        return new MarketItemDetailResponse(item);
    }

    @Transactional
    public Long createItem(Long userId, MarketItemCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        
        School school = user.getSchool();
        if (school == null) {
            throw new BusinessException(ErrorCode.SCHOOL_NOT_FOUND);
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
                
        // Save first or analyze? If we analyze, item needs to be not null, but ID might not be assigned yet. 
        // AiRiskService expects MarketItem to be saved if it has a foreign key in AiRiskAnalysis. 
        // So we should save it first to generate ID.
        MarketItem savedItem = itemRepository.save(item);
        
        // AI Risk Analysis
        aiRiskService.analyzeMarketItem(savedItem);
        
        return savedItem.getId();
    }

    @Transactional
    public void updateItem(Long userId, Long itemId, MarketItemUpdateRequest request) {
        MarketItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));
                
        if (!item.isSeller(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
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
        
        // Re-analyze on update
        aiRiskService.analyzeMarketItem(item);

        if (!Objects.equals(oldListedPrice, item.getListedPrice())) {
            eventPublisher.publishEvent(new MarketItemPriceChangedEvent(item.getId(), item.getTitle(),
                    oldListedPrice, item.getListedPrice(), userId));
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
}
