package com.universe.admin.service;
import com.universe.report.service.ModerationException;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import static com.universe.report.service.ModerationException.Code.INVALID_SANCTION;

@Component
public class ReportSuspensionPolicy {
    private final long days;
    public ReportSuspensionPolicy(@Value("${admin.report.suspension-days:0}") long days) { this.days = days; }
    public LocalDateTime endAt() {
        if (days < 1 || days > 3650) throw new ModerationException(INVALID_SANCTION);
        return LocalDateTime.now().plusDays(days);
    }
}
