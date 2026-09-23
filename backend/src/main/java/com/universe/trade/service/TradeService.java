package com.universe.trade.service;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.market.entity.MarketItem;
import com.universe.market.entity.TradeStatus;
import com.universe.market.repository.MarketItemRepository;
import com.universe.trade.dto.TradeCreateRequest;
import com.universe.trade.dto.TradeResponse;
import com.universe.trade.entity.Trade;
import com.universe.trade.repository.TradeRepository;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TradeService {

    private final TradeRepository tradeRepository;
    private final MarketItemRepository itemRepository;
    private final UserRepository userRepository;

    @Transactional
    public Long proposeTrade(Long buyerId, TradeCreateRequest request) {
        User buyer = userRepository.findById(buyerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        MarketItem item = itemRepository.findByIdForUpdate(request.getItemId())
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));

        if (item.getTradeStatus() != TradeStatus.SELLING) {
            throw new BusinessException(ErrorCode.INVALID_INPUT); // or a specific "NOT_SELLING" error
        }

        if (item.isSeller(buyerId)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT); // seller cannot propose trade to oneself
        }

        Trade trade = Trade.builder()
                .item(item)
                .seller(item.getSeller())
                .buyer(buyer)
                .listedPrice(item.getListedPrice())
                .build();

        item.changeTradeStatus(TradeStatus.TRADING);
        
        Trade saved = tradeRepository.save(trade);
        return saved.getId();
    }

    public TradeResponse getTradeDetail(Long userId, Long tradeId) {
        Trade trade = tradeRepository.findById(tradeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));

        if (!trade.getSeller().getId().equals(userId) && !trade.getBuyer().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        return new TradeResponse(trade);
    }

    @Transactional
    public void confirmTrade(Long userId, Long tradeId) {
        Trade trade = tradeRepository.findById(tradeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));

        if (trade.getStatus() != TradeStatus.TRADING) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        boolean isSeller = trade.getSeller().getId().equals(userId);
        boolean isBuyer = trade.getBuyer().getId().equals(userId);

        if (!isSeller && !isBuyer) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        if (isSeller) {
            trade.confirmBySeller();
        } else {
            trade.confirmByBuyer();
        }

        if (trade.getStatus() == TradeStatus.COMPLETED) {
            trade.getItem().changeTradeStatus(TradeStatus.COMPLETED);
        }
    }

    @Transactional
    public void cancelTrade(Long userId, Long tradeId) {
        Trade trade = tradeRepository.findById(tradeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ITEM_NOT_FOUND));

        if (!trade.getSeller().getId().equals(userId) && !trade.getBuyer().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        if (trade.getStatus() == TradeStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        trade.cancelTrade();
        trade.getItem().changeTradeStatus(TradeStatus.SELLING);
    }
}
