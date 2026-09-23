package com.universe.market.repository;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.universe.market.entity.MarketItem;
import com.universe.market.entity.TradeStatus;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import static com.universe.market.entity.QMarketItem.marketItem;

public class MarketItemRepositoryImpl implements MarketItemRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public MarketItemRepositoryImpl(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);
    }

    @Override
    public Page<MarketItem> searchItems(Long schoolId, String category, String keyword, String sort, Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder()
                .and(marketItem.school.id.eq(schoolId));

        if (category != null && !category.isBlank()) {
            builder.and(marketItem.category.stringValue().equalsIgnoreCase(category));
        }

        if (keyword != null && !keyword.isBlank()) {
            builder.and(marketItem.title.containsIgnoreCase(keyword)
                    .or(marketItem.description.containsIgnoreCase(keyword)));
        }

        var query = queryFactory.selectFrom(marketItem)
                .join(marketItem.seller).fetchJoin()
                .join(marketItem.school).fetchJoin()
                .where(builder);

        OrderSpecifier<?> orderSpecifier = new OrderSpecifier<>(Order.DESC, marketItem.createdAt);
        if ("price_asc".equalsIgnoreCase(sort)) {
            orderSpecifier = new OrderSpecifier<>(Order.ASC, marketItem.listedPrice);
        } else if ("price_desc".equalsIgnoreCase(sort)) {
            orderSpecifier = new OrderSpecifier<>(Order.DESC, marketItem.listedPrice);
        }

        var list = query.orderBy(orderSpecifier)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory.select(marketItem.count())
                .from(marketItem)
                .where(builder)
                .fetchOne();

        return new PageImpl<>(list, pageable, total == null ? 0 : total);
    }
}
