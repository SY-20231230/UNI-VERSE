package com.universe.user.repository;
import com.universe.community.entity.*;
import org.springframework.data.domain.*;
import org.springframework.data.repository.Repository;
public interface MyPagePostRepository extends Repository<CommunityPost, Long> {
    Page<CommunityPost> findByUserIdAndStatusNot(Long userId, PostStatus status, Pageable pageable);
    long countByUserIdAndStatusNot(Long userId, PostStatus status);
}
