package com.universe.user.service;
import com.universe.user.repository.*;
import com.universe.user.dto.response.MarketItemListResponse;
import com.universe.trust.repository.TrustHistoryRepository;
import com.universe.report.service.ModerationAccessService;
import com.universe.market.entity.TradeStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import java.util.Arrays;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class MyPageServiceTest {
    @Mock ModerationAccessService access;
    @Mock MyPagePostRepository posts;
    @Mock MyPageItemRepository items;
    @Mock MyPageTradeRepository trades;
    @Mock TrustHistoryRepository histories;
    @InjectMocks MyPageService service;

    @Test void itemSearchAlwaysUsesAuthenticatedSeller() {
        Pageable page = PageRequest.of(0, 20);
        when(items.findBySellerIdAndTradeStatus(42L, TradeStatus.SELLING, page)).thenReturn(Page.empty(page));
        assertThat(service.findItems(42L, TradeStatus.SELLING, page)).isEmpty();
        verify(access).requireActiveUser(42L);
        verify(items).findBySellerIdAndTradeStatus(42L, TradeStatus.SELLING, page);
    }

    @Test void itemResponseCannotExposePurchasePrice() {
        assertThat(Arrays.stream(MarketItemListResponse.class.getRecordComponents()).map(c -> c.getName()))
                .doesNotContain("purchasePrice", "seller", "item");
    }
}
