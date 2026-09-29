package com.universe.community.repository;

import com.universe.community.entity.Comment;
import com.universe.community.entity.PostStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    Page<Comment> findByPostIdAndStatusOrderByCreatedAtAsc(Long postId, PostStatus status, Pageable pageable);

    List<Comment> findByPostIdAndUserIdAndStatus(Long postId, Long userId, PostStatus status);

    Optional<Comment> findByIdAndStatus(Long id, PostStatus status);

    @Query("""
            select new com.universe.community.repository.PostCommentCount(c.post.id, count(c))
            from Comment c
            where c.post.id in :postIds and c.status = :status
            group by c.post.id
            """)
    List<PostCommentCount> countByPostIdsAndStatus(
            @Param("postIds") List<Long> postIds,
            @Param("status") PostStatus status);
}
