package com.universe.trust.service;

import com.universe.market.entity.*;
import com.universe.school.entity.School;
import com.universe.trade.entity.Trade;
import com.universe.user.entity.User;
import com.universe.report.repository.ModerationUserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.concurrent.*;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false",
        "spring.sql.init.mode=never", "spring.flyway.enabled=false", "spring.liquibase.enabled=false"})
@Import({TrustScoreService.class, TrustScorePolicy.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class TrustConcurrencyTest {
    @Autowired EntityManager em;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired TrustScoreService trust;
    @Autowired ModerationUserRepository users;

    @Test void concurrentCompletionsDoNotLoseScoresEvenWhenUsersWereAlreadyLoaded() throws Exception {
        var tx = new TransactionTemplate(transactionManager);
        long[] ids = tx.execute(status -> {
            String suffix = UUID.randomUUID().toString();
            var school = School.builder().schoolName(suffix).emailDomain(suffix + ".example").build(); em.persist(school);
            User seller = user("seller-" + suffix), buyer = user("buyer-" + suffix);
            seller.verifySchool(school); buyer.verifySchool(school); em.persist(seller); em.persist(buyer);
            trust.initializeNewUser(seller.getId()); trust.initializeNewUser(buyer.getId()); em.flush();
            var item = MarketItem.builder().seller(seller).school(school).title("item")
                    .category(ItemCategory.values()[0]).itemCondition(ItemCondition.values()[0])
                    .listedPrice(10L).purchasePrice(20L).description("item").build(); em.persist(item);
            for (int i = 0; i < 4; i++) trust.recordCompletedTrade(trade(seller, buyer, item).getId());
            return new long[] {seller.getId(), buyer.getId(), trade(seller, buyer, item).getId(), trade(seller, buyer, item).getId()};
        });
        var ready = new CountDownLatch(2);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> credit(tx, ids[0], ids[2], ready));
            var second = pool.submit(() -> credit(tx, ids[0], ids[3], ready));
            first.get(20, TimeUnit.SECONDS); second.get(20, TimeUnit.SECONDS);
        }
        tx.executeWithoutResult(status -> {
            assertThat(users.findById(ids[0]).orElseThrow().getTrustScore()).isEqualTo(70);
            assertThat(users.findById(ids[1]).orElseThrow().getTrustScore()).isEqualTo(70);
        });
    }

    void credit(TransactionTemplate tx, long userId, long tradeId, CountDownLatch ready) {
        tx.executeWithoutResult(status -> {
            users.findById(userId).orElseThrow().getTrustScore();
            ready.countDown();
            try {
                if (!ready.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Worker did not start");
            } catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw new IllegalStateException(ex); }
            trust.recordCompletedTrade(tradeId);
        });
    }

    User user(String email) { return User.builder().email(email + "@example.com").password("test").name("name").nickname("name").build(); }
    Trade trade(User seller, User buyer, MarketItem item) {
        var trade = Trade.builder().seller(seller).buyer(buyer).item(item).listedPrice(10L).build();
        trade.confirmBySeller(); trade.confirmByBuyer(); em.persist(trade); em.flush(); return trade;
    }
}
