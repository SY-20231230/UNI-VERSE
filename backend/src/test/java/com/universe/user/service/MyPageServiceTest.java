package com.universe.user.service;

import com.universe.community.entity.CommunityPost;
import com.universe.community.entity.PostCategory;
import com.universe.community.entity.PostStatus;
import com.universe.market.entity.ItemCategory;
import com.universe.market.entity.ItemCondition;
import com.universe.market.entity.MarketItem;
import com.universe.market.entity.TradeStatus;
import com.universe.report.service.ModerationAccessService;
import com.universe.school.entity.School;
import com.universe.trust.entity.TrustHistory;
import com.universe.trust.repository.TrustHistoryRepository;
import com.universe.user.dto.response.MarketItemListResponse;
import com.universe.user.entity.User;
import com.universe.user.repository.MyPageItemRepository;
import com.universe.user.repository.MyPagePostRepository;
import com.universe.user.repository.MyPageTradeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MyPageServiceTest {
    @Mock ModerationAccessService access;
    @Mock MyPagePostRepository posts;
    @Mock MyPageItemRepository items;
    @Mock MyPageTradeRepository trades;
    @Mock TrustHistoryRepository histories;
    @InjectMocks MyPageService service;

    @Test void summaryUsesAuthenticatedUserAndCountsVisibleActivity() {
        School school = School.builder().schoolName("UNI").emailDomain("uni.test").build();
        ReflectionTestUtils.setField(school, "id", 10L);
        User user = user(42L);
        user.verifySchool(school);
        when(access.requireActiveUser(42L)).thenReturn(user);
        when(posts.countByUserIdAndStatusNot(42L, PostStatus.DELETED)).thenReturn(3L);
        when(items.countBySellerId(42L)).thenReturn(4L);
        when(trades.countCompleted(42L)).thenReturn(5L);

        var response = service.getSummary(42L);

        assertThat(response.userId()).isEqualTo(42L);
        assertThat(response.schoolId()).isEqualTo(10L);
        assertThat(response.schoolName()).isEqualTo("UNI");
        assertThat(response.schoolVerified()).isTrue();
        assertThat(response.trustScore()).isEqualTo(50);
        assertThat(response.postCount()).isEqualTo(3);
        assertThat(response.marketItemCount()).isEqualTo(4);
        assertThat(response.completedTradeCount()).isEqualTo(5);
    }

    @Test void postSearchUsesAuthenticatedUserAndExcludesDeletedPosts() {
        Pageable page = PageRequest.of(1, 10);
        CommunityPost post = CommunityPost.builder().user(user(42L))
                .category(PostCategory.FREE).title("title").content("content").isAnonymous(true).build();
        ReflectionTestUtils.setField(post, "id", 7L);
        when(posts.findByUserIdAndStatusNot(42L, PostStatus.DELETED, page))
                .thenReturn(new PageImpl<>(List.of(post), page, 11));

        Page<?> response = service.findPosts(42L, page);

        assertThat(response.getTotalElements()).isEqualTo(11);
        assertThat(response.getContent()).extracting("postId").containsExactly(7L);
        verify(access).requireActiveUser(42L);
    }

    @Test void itemSearchWithoutStatusUsesAuthenticatedSeller() {
        Pageable page = PageRequest.of(0, 20);
        MarketItem item = item(user(42L));
        ReflectionTestUtils.setField(item, "id", 8L);
        when(items.findBySellerId(42L, page)).thenReturn(new PageImpl<>(List.of(item), page, 1));

        var response = service.findItems(42L, null, page);

        assertThat(response.getContent()).extracting(MarketItemListResponse::itemId).containsExactly(8L);
        verify(items).findBySellerId(42L, page);
        verify(items, never()).findBySellerIdAndTradeStatus(anyLong(), any(), any());
    }

    @Test void itemSearchWithStatusUsesAuthenticatedSeller() {
        Pageable page = PageRequest.of(0, 20);
        when(items.findBySellerIdAndTradeStatus(42L, TradeStatus.SELLING, page)).thenReturn(Page.empty(page));

        assertThat(service.findItems(42L, TradeStatus.SELLING, page)).isEmpty();

        verify(access).requireActiveUser(42L);
        verify(items).findBySellerIdAndTradeStatus(42L, TradeStatus.SELLING, page);
    }

    @Test void trustHistoryMapsOnlyAuthenticatedUsersEntries() {
        Pageable page = PageRequest.of(0, 10);
        TrustHistory history = TrustHistory.builder().user(user(42L)).beforeScore(40)
                .changeAmount(10).afterScore(50).reason("SAFE_TRADE:5").build();
        ReflectionTestUtils.setField(history, "id", 9L);
        when(histories.findByUserId(42L, page)).thenReturn(new PageImpl<>(List.of(history), page, 1));

        var response = service.findTrustHistory(42L, page);

        assertThat(response.getContent()).singleElement().satisfies(result -> {
            assertThat(result.trustHistoryId()).isEqualTo(9L);
            assertThat(result.beforeScore()).isEqualTo(40);
            assertThat(result.afterScore()).isEqualTo(50);
            assertThat(result.reason()).isEqualTo("SAFE_TRADE:5");
        });
        verify(access).requireActiveUser(42L);
    }

    @Test void accessFailureStopsEveryRepositoryCall() {
        RuntimeException denied = new RuntimeException("denied");
        when(access.requireActiveUser(42L)).thenThrow(denied);

        assertThatThrownBy(() -> service.getSummary(42L)).isSameAs(denied);

        verifyNoInteractions(posts, items, trades, histories);
    }

    @Test void itemResponseCannotExposePurchasePrice() {
        assertThat(Arrays.stream(MarketItemListResponse.class.getRecordComponents()).map(component -> component.getName()))
                .doesNotContain("purchasePrice", "seller", "item");
    }

    private User user(long id) {
        User user = User.builder().email(id + "@test.example").password("secret")
                .name("name").nickname("nick").build();
        ReflectionTestUtils.setField(user, "id", id);
        user.addTrustScore(50);
        return user;
    }

    private MarketItem item(User seller) {
        School school = School.builder().schoolName("UNI").emailDomain("uni.test").build();
        return MarketItem.builder().seller(seller).school(school).title("item")
                .category(ItemCategory.ETC).itemCondition(ItemCondition.GOOD)
                .purchasePrice(1000L).listedPrice(800L).description("description").build();
    }
}
