package com.universe.market.service;

import com.universe.ai.service.AiRiskService;
import com.universe.market.dto.MarketItemListResponse;
import com.universe.market.entity.MarketItem;
import com.universe.market.repository.ItemFavoriteCount;
import com.universe.market.repository.MarketItemFavoriteRepository;
import com.universe.market.repository.MarketItemImageRepository;
import com.universe.market.repository.MarketItemRepository;
import com.universe.school.entity.School;
import com.universe.trade.repository.TradeRepository;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketItemListFavoriteCountTest {

    @Mock MarketItemRepository itemRepository;
    @Mock MarketItemImageRepository imageRepository;
    @Mock UserRepository userRepository;
    @Mock TradeRepository tradeRepository;
    @Mock MarketItemFavoriteRepository favoriteRepository;
    @Mock AiRiskService aiRiskService;
    @Mock ApplicationEventPublisher eventPublisher;
    @Mock com.universe.file.service.FileService fileService;
    @InjectMocks MarketItemService service;

    @Test
    void searchItemsIncludesFavoriteCountUsingSingleBatchQuery() {
        MarketItem item = mock(MarketItem.class);
        User seller = mock(User.class);
        School school = mock(School.class);
        PageRequest pageable = PageRequest.of(0, 20);

        when(item.getId()).thenReturn(11L);
        when(item.getSeller()).thenReturn(seller);
        when(item.getSchool()).thenReturn(school);
        when(item.getImages()).thenReturn(List.of());
        when(seller.getNickname()).thenReturn("seller");
        when(school.getSchoolName()).thenReturn("school");
        when(item.getLikeCount()).thenReturn(3L);
        when(itemRepository.searchItems(1L, null, null, "latest", null, pageable))
                .thenReturn(new PageImpl<>(List.of(item), pageable, 1));

        Page<MarketItemListResponse> result = service.searchItems(1L, null, null, "latest", null, pageable);

        assertThat(result.getContent()).singleElement()
                .extracting(MarketItemListResponse::getLikeCount)
                .isEqualTo(3L);
    }
}
