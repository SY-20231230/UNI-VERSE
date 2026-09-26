package com.universe.notification.event;

/** 채팅 요청 생성 시 채팅 도메인에서 발행한다. itemTitle 은 상품 기반 요청이 아니면 null. */
public record ChatRequestedEvent(Long chatRequestId, Long receiverId, String itemTitle) {
}
