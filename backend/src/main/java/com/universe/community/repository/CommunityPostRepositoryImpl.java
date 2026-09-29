package com.universe.community.repository;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.universe.community.entity.CommunityPost;
import com.universe.community.entity.PostStatus;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import static com.universe.community.entity.QCommunityPost.communityPost;
import static com.universe.community.entity.QPostHashtag.postHashtag;
import static com.universe.community.entity.QPostLike.postLike;
import static com.universe.community.entity.QHashtag.hashtag;

public class CommunityPostRepositoryImpl implements CommunityPostRepositoryCustom {
    private final JPAQueryFactory queryFactory;
    public CommunityPostRepositoryImpl(EntityManager em){this.queryFactory=new JPAQueryFactory(em);}
    @Override public Page<CommunityPost> search(Long schoolId,String category,String keyword,String hashtagName,String sort,Pageable pageable){
        BooleanBuilder b=new BooleanBuilder().and(communityPost.school.id.eq(schoolId)).and(communityPost.status.eq(PostStatus.ACTIVE));
        if(category!=null&&!category.isBlank()) b.and(communityPost.category.stringValue().equalsIgnoreCase(category));
        if(keyword!=null&&!keyword.isBlank()) b.and(communityPost.title.containsIgnoreCase(keyword).or(communityPost.content.containsIgnoreCase(keyword)));
        var query=queryFactory.selectDistinct(communityPost).from(communityPost)
            .join(communityPost.user).fetchJoin()
            .join(communityPost.school).fetchJoin();
        if(hashtagName!=null&&!hashtagName.isBlank()) query.join(postHashtag).on(postHashtag.post.eq(communityPost)).join(postHashtag.hashtag,hashtag).where(b.and(hashtag.name.eq(hashtagName)));
        else query.where(b);
        if("popular".equalsIgnoreCase(sort)) query.leftJoin(postLike).on(postLike.post.eq(communityPost));
        OrderSpecifier<?> order="popular".equalsIgnoreCase(sort)?new OrderSpecifier<>(Order.DESC,postLike.post.count()):new OrderSpecifier<>(Order.DESC,communityPost.createdAt);
        var list=query.groupBy(communityPost.id).orderBy(order).offset(pageable.getOffset()).limit(pageable.getPageSize()).fetch();
        Long total=hashtagName!=null&&!hashtagName.isBlank()?queryFactory.select(communityPost.countDistinct()).from(communityPost).join(postHashtag).on(postHashtag.post.eq(communityPost)).join(postHashtag.hashtag,hashtag).where(b.and(hashtag.name.eq(hashtagName))).fetchOne():queryFactory.select(communityPost.count()).from(communityPost).where(b).fetchOne();
        return new PageImpl<>(list,pageable,total==null?0:total);
    }
}
