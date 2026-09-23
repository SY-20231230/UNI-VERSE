package com.universe.community.repository;

import com.universe.community.entity.Comment;
import com.universe.community.entity.PostStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    Page<Comment> findByPostIdAndStatusOrderByCreatedAtAsc(Long postId, PostStatus status, Pageable pageable);
    Optional<Comment> findByIdAndStatus(Long id, PostStatus status);
}
