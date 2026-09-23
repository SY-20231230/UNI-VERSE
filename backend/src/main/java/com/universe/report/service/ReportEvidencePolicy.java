package com.universe.report.service;

import java.net.URI;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import static com.universe.report.service.ModerationException.Code.*;

@Component
public class ReportEvidencePolicy {
    private final String baseUrl;

    public ReportEvidencePolicy(@Value("${report.evidence.base-url:}") String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public void validate(List<String> urls) {
        if (urls.isEmpty()) return;
        if (baseUrl.isBlank()) throw new ModerationException(EVIDENCE_STORAGE_NOT_CONFIGURED);
        try {
            URI base = URI.create(baseUrl);
            String prefix = base.getPath().endsWith("/") ? base.getPath() : base.getPath() + "/";
            if (!"https".equals(base.getScheme()) || base.getHost() == null) throw new IllegalArgumentException();
            for (String url : urls) {
                URI uri = URI.create(url);
                if (!"https".equals(uri.getScheme()) || !base.getHost().equalsIgnoreCase(uri.getHost())
                        || base.getPort() != uri.getPort() || uri.getUserInfo() != null
                        || uri.getQuery() != null || uri.getFragment() != null
                        || !uri.getPath().startsWith(prefix) || uri.getPath().length() <= prefix.length()
                        || !uri.getRawPath().equals(uri.getPath())
                        || !uri.normalize().equals(uri) || uri.getPath().contains("\\")) {
                    throw new IllegalArgumentException();
                }
            }
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new ModerationException(INVALID_EVIDENCE_URL);
        }
    }
}
