package com.universe.admin.dto.response;

import com.universe.community.entity.CommunityPost;
import com.universe.market.entity.MarketItem;
import com.universe.market.entity.MarketItemImage;

import java.util.List;

/** 신고 대상 상품·게시글 미리보기. 관리자는 학교가 달라도 신고된 내용을 확인할 수 있어야 한다. */
public record AdminReportedContentResponse(String kind, Long id, String title, String content,
        Long price, String status, List<String> imageUrls) {

    public static AdminReportedContentResponse from(MarketItem item) {
        return new AdminReportedContentResponse("ITEM", item.getId(), item.getTitle(), item.getDescription(),
                item.getListedPrice(), item.getTradeStatus() == null ? null : item.getTradeStatus().name(),
                item.getImages().stream().map(MarketItemImage::getImageUrl).toList());
    }

    public static AdminReportedContentResponse from(CommunityPost post) {
        return new AdminReportedContentResponse("POST", post.getId(), post.getTitle(), post.getContent(),
                null, post.getStatus() == null ? null : post.getStatus().name(), List.of());
    }
}
