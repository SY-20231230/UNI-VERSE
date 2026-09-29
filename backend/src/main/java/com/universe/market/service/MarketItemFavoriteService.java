package com.universe.market.service;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.market.entity.MarketItem;
import com.universe.market.entity.MarketItemFavorite;
import com.universe.market.repository.MarketItemFavoriteRepository;
import com.universe.market.repository.MarketItemRepository;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarketItemFavoriteService {

    private final MarketItemFavoriteRepository favoriteRepository;
    private final MarketItemRepository itemRepository;
    private final UserRepository userRepository;

    @Transactional
    public void toggleFavorite(Long itemId, Long userId) {
        MarketItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));
        
        if (favoriteRepository.existsByItemIdAndUserId(itemId, userId)) {
            favoriteRepository.deleteByItemIdAndUserId(itemId, userId);
        } else {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
            
            MarketItemFavorite favorite = MarketItemFavorite.builder()
                    .item(item)
                    .user(user)
                    .build();
            favoriteRepository.save(favorite);
        }
    }
}
