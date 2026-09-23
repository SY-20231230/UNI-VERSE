package com.universe.market.dto;

import com.universe.ai.entity.AiAnalysisResult;
import com.universe.market.entity.ItemCategory;
import com.universe.market.entity.MarketItem;
import com.universe.market.entity.TradeStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class MarketItemListResponse {
    private Long id;
    private String title;
    private ItemCategory category;
    private Long listedPrice;
    private TradeStatus tradeStatus;
    private AiAnalysisResult aiStatus;
    private LocalDateTime createdAt;
    private String sellerNickname;
    private String schoolName;

    public MarketItemListResponse(MarketItem item) {
        this.id = item.getId();
        this.title = item.getTitle();
        this.category = item.getCategory();
        this.listedPrice = item.getListedPrice();
        this.tradeStatus = item.getTradeStatus();
        this.aiStatus = item.getAiStatus();
        this.createdAt = item.getCreatedAt();
        this.sellerNickname = item.getSeller().getNickname();
        this.schoolName = item.getSchool().getSchoolName();
    }
}
