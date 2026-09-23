package com.universe.market.dto;

import com.universe.ai.entity.AiAnalysisResult;
import com.universe.market.entity.ItemCategory;
import com.universe.market.entity.ItemCondition;
import com.universe.market.entity.MarketItem;
import com.universe.market.entity.TradeStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class MarketItemDetailResponse {
    private Long id;
    private String title;
    private String description;
    private ItemCategory category;
    private ItemCondition condition;
    private Long listedPrice;
    private TradeStatus tradeStatus;
    private AiAnalysisResult aiStatus;
    private LocalDateTime createdAt;
    
    private Long sellerId;
    private String sellerNickname;
    private Long schoolId;
    private String schoolName;

    // Notice that purchasePrice is intentionally omitted per security rules!

    public MarketItemDetailResponse(MarketItem item) {
        this.id = item.getId();
        this.title = item.getTitle();
        this.description = item.getDescription();
        this.category = item.getCategory();
        this.condition = item.getItemCondition();
        this.listedPrice = item.getListedPrice();
        this.tradeStatus = item.getTradeStatus();
        this.aiStatus = item.getAiStatus();
        this.createdAt = item.getCreatedAt();
        
        this.sellerId = item.getSeller().getId();
        this.sellerNickname = item.getSeller().getNickname();
        this.schoolId = item.getSchool().getId();
        this.schoolName = item.getSchool().getSchoolName();
    }
}
