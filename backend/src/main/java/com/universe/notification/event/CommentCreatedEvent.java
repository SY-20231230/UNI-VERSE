package com.universe.notification.event;

/** parentCommentAuthorId 는 대댓글일 때만 존재한다. 익명 댓글 보호를 위해 작성자 정보는 알림 내용에 쓰지 않는다. */
public record CommentCreatedEvent(Long postId, String postTitle, Long postAuthorId, Long commenterId,
        Long parentCommentAuthorId) {
}
