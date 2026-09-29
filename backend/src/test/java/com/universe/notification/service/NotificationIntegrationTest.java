package com.universe.notification.service;

import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.market.entity.*;
import com.universe.notification.entity.Notification;
import com.universe.notification.entity.NotificationType;
import com.universe.notification.event.*;
import com.universe.notification.repository.NotificationRepository;
import com.universe.report.entity.SanctionType;
import com.universe.school.entity.School;
import com.universe.user.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

/** AFTER_COMMIT 리스너를 검증하려면 실제 커밋이 필요하므로 테스트 트랜잭션을 끄고 직접 정리한다. */
@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false",
        "spring.sql.init.mode=never", "spring.flyway.enabled=false", "spring.liquibase.enabled=false"})
@Import({NotificationService.class, NotificationEventListener.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class NotificationIntegrationTest {
    @Autowired EntityManager em;
    @Autowired PlatformTransactionManager txManager;
    @Autowired ApplicationEventPublisher events;
    @Autowired NotificationService service;
    @Autowired NotificationRepository notifications;
    TransactionTemplate tx;
    School school;
    User author, commenter, replier;

    @BeforeEach void setup() {
        tx = new TransactionTemplate(txManager);
        tx.executeWithoutResult(s -> {
            school = School.builder().schoolName("Test school").emailDomain("test.example").build();
            em.persist(school);
            author = createUser("author"); commenter = createUser("commenter"); replier = createUser("replier");
        });
    }

    @AfterEach void cleanup() {
        tx.executeWithoutResult(s -> {
            for (String entity : List.of("Notification", "MarketItemFavorite", "MarketItem", "User", "School"))
                em.createQuery("delete from " + entity).executeUpdate();
        });
    }

    User createUser(String label) {
        var user = User.builder().email(label + "@test.example").password("test-only").name(label).nickname(label).build();
        user.verifySchool(school); em.persist(user); return user;
    }

    void publishCommitted(Object event) { tx.executeWithoutResult(s -> events.publishEvent(event)); }

    List<Notification> inbox(User user) {
        return notifications.findByReceiverId(user.getId(), PageRequest.of(0, 50, Sort.by("id"))).getContent();
    }

    @Test void replyNotifiesPostAuthorAndParentCommenterButNeverTheActor() {
        publishCommitted(new CommentCreatedEvent(7L, "title", author.getId(), replier.getId(), commenter.getId()));
        publishCommitted(new CommentCreatedEvent(7L, "title", author.getId(), author.getId(), null));

        assertThat(inbox(author)).extracting(Notification::getType).containsExactly(NotificationType.COMMENT);
        assertThat(inbox(commenter)).extracting(Notification::getType).containsExactly(NotificationType.REPLY);
        assertThat(inbox(replier)).isEmpty();
        assertThat(inbox(author).get(0).getTargetId()).isEqualTo(7L);
    }

    @Test void rolledBackWorkDoesNotNotify() {
        tx.executeWithoutResult(s -> {
            events.publishEvent(new PostLikedEvent(7L, "title", author.getId(), commenter.getId()));
            s.setRollbackOnly();
        });
        assertThat(inbox(author)).isEmpty();
    }

    @Test void favoriteStatusAndPriceChangesReachFavoritersExceptActor() {
        Long itemId = tx.execute(s -> {
            var item = MarketItem.builder().seller(author).school(school).title("book")
                    .category(ItemCategory.values()[0]).itemCondition(ItemCondition.values()[0])
                    .purchasePrice(20000L).listedPrice(10000L).description("book").build();
            em.persist(item);
            em.persist(MarketItemFavorite.builder().item(item).user(commenter).build());
            em.persist(MarketItemFavorite.builder().item(item).user(replier).build());
            return item.getId();
        });

        publishCommitted(new MarketItemStatusChangedEvent(itemId, "book", TradeStatus.TRADING, replier.getId()));
        publishCommitted(new MarketItemPriceChangedEvent(itemId, "book", 10000L, 8000L, author.getId()));

        assertThat(inbox(commenter)).extracting(Notification::getType)
                .containsExactly(NotificationType.FAVORITE_ITEM_STATUS, NotificationType.FAVORITE_ITEM_PRICE);
        assertThat(inbox(commenter).get(1).getContent()).contains("10,000원", "8,000원").doesNotContain("20,000");
        assertThat(inbox(replier)).extracting(Notification::getType).containsExactly(NotificationType.FAVORITE_ITEM_PRICE);
        assertThat(inbox(author)).isEmpty();
    }

    @Test void moderationResultsReachReporterAndSanctionedUser() {
        publishCommitted(new ReportProcessedEvent(3L, commenter.getId(), false));
        publishCommitted(new SanctionImposedEvent(5L, author.getId(), SanctionType.SUSPENSION,
                LocalDateTime.of(2026, 10, 1, 12, 0)));

        assertThat(inbox(commenter).get(0).getContent()).contains("반려");
        assertThat(inbox(author).get(0).getContent()).contains("2026.10.01 12:00까지");
    }

    @Test void readStateIsScopedToTheOwner() {
        publishCommitted(new PostLikedEvent(7L, "title", author.getId(), commenter.getId()));
        publishCommitted(new PostLikedEvent(8L, "title", author.getId(), commenter.getId()));
        Long first = inbox(author).get(0).getId();

        assertThatThrownBy(() -> service.markAsRead(commenter.getId(), first))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOTIFICATION_NOT_FOUND));
        assertThatThrownBy(() -> service.delete(commenter.getId(), first)).isInstanceOf(BusinessException.class);

        assertThat(service.markAsRead(author.getId(), first).isRead()).isTrue();
        assertThat(service.getUnreadCount(author.getId()).unreadCount()).isEqualTo(1);
        service.markAllAsRead(author.getId());
        assertThat(service.getUnreadCount(author.getId()).unreadCount()).isZero();
        service.delete(author.getId(), first);
        assertThat(inbox(author)).hasSize(1);
    }
}
