package com.universe.community.repository;

import com.universe.community.entity.CommunityPost;
import com.universe.community.entity.PostStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long>, CommunityPostRepositoryCustom {
    Optional<CommunityPost> findByIdAndStatus(Long id, PostStatus status);
}
