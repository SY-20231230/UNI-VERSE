package com.universe.user.dto.response;

import com.universe.community.entity.*;
import java.time.LocalDateTime;

/** My-page projection, pending a shared read DTO from the community owner. */
public record CommunityPostListResponse(Long postId, String title, PostCategory category,
        boolean isAnonymous, int viewCount, PostStatus status, LocalDateTime createdAt, LocalDateTime updatedAt) {
    public static CommunityPostListResponse from(CommunityPost post) {
        return new CommunityPostListResponse(post.getId(), post.getTitle(), post.getCategory(),
                Boolean.TRUE.equals(post.getIsAnonymous()), post.getViewCount(), post.getStatus(),
                post.getCreatedAt(), post.getUpdatedAt());
    }
}
