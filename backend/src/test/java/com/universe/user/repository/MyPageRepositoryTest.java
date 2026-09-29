package com.universe.user.repository;

import com.universe.community.entity.CommunityPost;
import com.universe.community.entity.PostCategory;
import com.universe.community.entity.PostStatus;
import com.universe.market.entity.ItemCategory;
import com.universe.market.entity.ItemCondition;
import com.universe.market.entity.MarketItem;
import com.universe.market.entity.TradeStatus;
import com.universe.school.entity.School;
import com.universe.trade.entity.Trade;
import com.universe.trust.entity.TrustHistory;
import com.universe.trust.repository.TrustHistoryRepository;
import com.universe.user.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never",
        "spring.jpa.show-sql=false"
})
class MyPageRepositoryTest {
    @Autowired EntityManager em;
    @Autowired MyPagePostRepository posts;
    @Autowired MyPageItemRepository items;
    @Autowired MyPageTradeRepository trades;
    @Autowired TrustHistoryRepository histories;

    School school;
    User owner;
    User other;

    @BeforeEach void setup() {
        school = School.builder().schoolName("Test school").emailDomain("test.example").build();
        em.persist(school);
        owner = user("owner");
        other = user("other");
    }

    @Test void postQueryReturnsOnlyOwnersNonDeletedPostsAndKeepsPaging() {
        CommunityPost active = post(owner, "active");
        CommunityPost deleted = post(owner, "deleted");
        deleted.deletePost();
        post(other, "other");
        em.flush();

        var page = posts.findByUserIdAndStatusNot(owner.getId(), PostStatus.DELETED, PageRequest.of(0, 1));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent()).extracting(CommunityPost::getId).containsExactly(active.getId());
        assertThat(posts.countByUserIdAndStatusNot(owner.getId(), PostStatus.DELETED)).isEqualTo(1);
    }

    @Test void itemQueriesFilterByAuthenticatedSellerAndOptionalStatus() {
        MarketItem selling = item(owner, "selling");
        MarketItem cancelled = item(owner, "cancelled");
        cancelled.changeTradeStatus(TradeStatus.CANCELLED);
        item(other, "other");
        em.flush();

        var all = items.findBySellerId(owner.getId(), PageRequest.of(0, 10));
        var filtered = items.findBySellerIdAndTradeStatus(owner.getId(), TradeStatus.SELLING, PageRequest.of(0, 10));

        assertThat(all.getContent()).extracting(MarketItem::getId)
                .containsExactlyInAnyOrder(selling.getId(), cancelled.getId());
        assertThat(filtered.getContent()).extracting(MarketItem::getId).containsExactly(selling.getId());
        assertThat(items.countBySellerId(owner.getId())).isEqualTo(2);
    }

    @Test void completedTradeCountRequiresBothConfirmationsAndCompletionTimestamp() {
        Trade completed = trade(owner, other, item(owner, "completed-item"));
        completed.confirmBySeller();
        completed.confirmByBuyer();
        em.persist(completed);
        Trade partial = trade(owner, other, item(owner, "partial-item"));
        partial.confirmBySeller();
        em.persist(partial);
        em.flush();

        assertThat(trades.countCompleted(owner.getId())).isEqualTo(1);
        assertThat(trades.countCompleted(other.getId())).isEqualTo(1);
    }

    @Test void trustHistoryQueryNeverReturnsAnotherUsersEntries() {
        TrustHistory own = history(owner, "INITIALIZED");
        history(other, "INITIALIZED");
        em.flush();

        var page = histories.findByUserId(owner.getId(), PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent()).extracting(TrustHistory::getId).containsExactly(own.getId());
    }

    private User user(String label) {
        User user = User.builder().email(label + "@test.example").password("secret")
                .name(label).nickname(label).build();
        user.verifySchool(school);
        em.persist(user);
        return user;
    }

    private CommunityPost post(User user, String title) {
        CommunityPost post = CommunityPost.builder().user(user).school(school).category(PostCategory.FREE)
                .title(title).content("content").isAnonymous(true).build();
        em.persist(post);
        return post;
    }

    private MarketItem item(User seller, String title) {
        MarketItem item = MarketItem.builder().seller(seller).school(school).title(title)
                .category(ItemCategory.ETC).itemCondition(ItemCondition.GOOD)
                .purchasePrice(1000L).listedPrice(800L).description("description").build();
        em.persist(item);
        return item;
    }

    private Trade trade(User seller, User buyer, MarketItem item) {
        return Trade.builder().item(item).seller(seller).buyer(buyer).listedPrice(item.getListedPrice()).build();
    }

    private TrustHistory history(User user, String reason) {
        TrustHistory history = TrustHistory.builder().user(user).beforeScore(0).changeAmount(50)
                .afterScore(50).reason(reason).build();
        em.persist(history);
        return history;
    }
}
