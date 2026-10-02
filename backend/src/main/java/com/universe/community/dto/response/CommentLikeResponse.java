package com.universe.community.dto.response;

public record CommentLikeResponse(Long commentId, boolean liked, long likeCount) {
}
