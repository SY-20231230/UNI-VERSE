package com.universe.community.repository;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.universe.community.entity.*;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.*;

import static com.universe.community.entity.QCommunityPost.communityPost;
import static com.universe.community.entity.QHashtag.hashtag;
import static com.universe.community.entity.QPostHashtag.postHashtag;
import static com.universe.community.entity.QPostLike.postLike;

public class CommunityPostRepositoryImpl implements CommunityPostRepositoryCustom {
    private final JPAQueryFactory queryFactory;

    public CommunityPostRepositoryImpl(EntityManager entityManager) {
        this.queryFactory = new JPAQueryFactory(entityManager);
    }

    @Override
    public Page<CommunityPost> search(Long schoolId, String category, String keyword,
            String hashtagName, String sort, Pageable pageable) {
        BooleanBuilder conditions = new BooleanBuilder()
                .and(communityPost.school.id.eq(schoolId))
                .and(communityPost.status.eq(PostStatus.ACTIVE));
        if (category != null && !category.isBlank()) {
            conditions.and(communityPost.category.stringValue().equalsIgnoreCase(category));
        }
        if (keyword != null && !keyword.isBlank()) {
            conditions.and(communityPost.title.containsIgnoreCase(keyword)
                    .or(communityPost.content.containsIgnoreCase(keyword)));
        }

        var query = queryFactory.select(communityPost).from(communityPost)
                .join(communityPost.user).fetchJoin()
                .join(communityPost.school).fetchJoin();
        if (hashtagName != null && !hashtagName.isBlank()) {
            query.join(postHashtag).on(postHashtag.post.eq(communityPost))
                    .join(postHashtag.hashtag, hashtag)
                    .where(conditions.and(hashtag.name.eq(hashtagName)));
        } else {
            query.where(conditions);
        }

        boolean popular = "popular".equalsIgnoreCase(sort);
        if (popular) {
            query.leftJoin(postLike).on(postLike.post.eq(communityPost));
        }
        OrderSpecifier<Integer> noticeFirst = new OrderSpecifier<>(Order.ASC,
                Expressions.cases().when(communityPost.category.eq(PostCategory.NOTICE)).then(0).otherwise(1));
        OrderSpecifier<?> requestedOrder = popular
                ? new OrderSpecifier<>(Order.DESC, postLike.post.count())
                : new OrderSpecifier<>(Order.DESC, communityPost.createdAt);
        var content = query.groupBy(communityPost.id)
                .orderBy(noticeFirst, requestedOrder, communityPost.createdAt.desc(), communityPost.id.desc())
                .offset(pageable.getOffset()).limit(pageable.getPageSize()).fetch();

        Long total = hashtagName != null && !hashtagName.isBlank()
                ? queryFactory.select(communityPost.countDistinct()).from(communityPost)
                        .join(postHashtag).on(postHashtag.post.eq(communityPost))
                        .join(postHashtag.hashtag, hashtag)
                        .where(conditions.and(hashtag.name.eq(hashtagName))).fetchOne()
                : queryFactory.select(communityPost.count()).from(communityPost)
                        .where(conditions).fetchOne();
        return new PageImpl<>(content, pageable, total == null ? 0 : total);
    }
}
