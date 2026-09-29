package com.universe.notification.event;

public record ReportProcessedEvent(Long reportId, Long reporterId, boolean approved) {
}
