package com.universe.chat.dto;

/** 읽음 처리 결과. lastReadMessageId는 방에 메시지가 없으면 null. */
public record ChatReadResponse(Long roomId, Long lastReadMessageId) {}
