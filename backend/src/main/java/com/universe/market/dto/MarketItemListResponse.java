package com.universe.market.dto;

import com.universe.ai.entity.AiAnalysisResult;
import com.universe.market.entity.ItemCategory;
import com.universe.market.entity.MarketItem;
import com.universe.market.entity.TradeStatus;
import com.universe.file.service.FileService;
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
    private String thumbnail;
    private int viewCount;
    private long likeCount;

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
        this.viewCount = item.getViewCount() == null ? 0 : item.getViewCount();
        this.likeCount = item.getLikeCount() == null ? 0L : item.getLikeCount();
        if (item.getImages() != null && !item.getImages().isEmpty()) {
            this.thumbnail = item.getImages().get(0).getImageUrl();
        }
    }

    public MarketItemListResponse(MarketItem item, FileService fileService) {
        this(item);
        if (item.getImages() != null && !item.getImages().isEmpty()) {
            this.thumbnail = fileService.getFileUrl(item.getImages().get(0).getImageUrl());
        }
    }
}
