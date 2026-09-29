package com.universe.report.service;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

class ReportEvidencePolicyTest {
    private final ReportEvidencePolicy policy = new ReportEvidencePolicy("https://evidence.example.com/reports/");

    @Test void acceptsConfiguredPrefix() {
        assertThatCode(() -> policy.validate(List.of("https://evidence.example.com/reports/abc.png"))).doesNotThrowAnyException();
    }

    @Test void missingConfigurationOnlyBlocksReportsWithEvidence() {
        var unconfigured = new ReportEvidencePolicy("");
        assertThatCode(() -> unconfigured.validate(List.of())).doesNotThrowAnyException();
        assertThatThrownBy(() -> unconfigured.validate(List.of("https://example.com/a")))
                .isInstanceOf(ModerationException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://evidence.example.com/reports/a.png", "https://evil.example/reports/a.png",
        "https://evidence.example.com/reports-other/a.png", "https://evidence.example.com/reports/../secret",
        "https://evidence.example.com/reports/%2e%2e/secret", "https://evidence.example.com/reports/a?token=x",
        "https://user@evidence.example.com/reports/a", "https://evidence.example.com/reports/a#fragment",
        "file:///reports/a", "https://evidence.example.com:9999/reports/a", "not a uri"})
    void rejectsUntrustedLocations(String url) {
        assertThatThrownBy(() -> policy.validate(List.of(url))).isInstanceOf(ModerationException.class);
    }
}
