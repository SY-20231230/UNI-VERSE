package com.universe.community.dto.response;

import com.universe.community.entity.Comment;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class CommentResponse {
    private Long commentId;
    private Long postId;
    private Long authorId;
    private String authorName;
    private String content;
    private boolean anonymous;
    private boolean postAuthor;
    private Long parentCommentId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean mine;
    private long likeCount;
    private boolean likedByCurrentUser;

    public static CommentResponse from(Comment comment) {
        return from(comment, null, 0L, false);
    }

    public static CommentResponse from(Comment comment, Long viewerId) {
        return from(comment, viewerId, 0L, false);
    }

    public static CommentResponse from(Comment comment, Long viewerId, long likeCount, boolean likedByCurrentUser) {
        boolean anonymous = Boolean.TRUE.equals(comment.getIsAnonymous());
        boolean postAuthor = comment.getPost().getUser().getId().equals(comment.getUser().getId());
        return new CommentResponse(
                comment.getId(), comment.getPost().getId(),
                anonymous ? null : comment.getUser().getId(),
                anonymous ? "익명" : comment.getUser().getNickname(),
                comment.getContent(), anonymous, postAuthor,
                comment.getParentComment() == null ? null : comment.getParentComment().getId(),
                comment.getCreatedAt(), comment.getUpdatedAt(),
                viewerId != null && viewerId.equals(comment.getUser().getId()),
                likeCount, likedByCurrentUser);
    }
}
