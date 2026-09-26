package com.universe.notification.event;

/** 채팅 요청 수락 시 채팅 도메인에서 발행한다. requesterId 는 요청을 보낸(알림 받을) 사용자. */
public record ChatAcceptedEvent(Long chatRoomId, Long requesterId, String itemTitle) {
}
