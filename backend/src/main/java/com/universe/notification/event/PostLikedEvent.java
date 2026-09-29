package com.universe.notification.event;

public record PostLikedEvent(Long postId, String postTitle, Long postAuthorId, Long likerId) {
}
