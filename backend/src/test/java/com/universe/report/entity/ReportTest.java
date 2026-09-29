package com.universe.report.entity;
import com.universe.user.entity.User;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ReportTest {
    @Test void approvalRecordsProcessorAndPreventsReprocessing() {
        var admin = User.builder().email("admin@test.example").password("test").name("admin").nickname("admin").build();
        var report = Report.builder().reportType(ReportType.SCAM).description("reason").build();
        report.approve(admin, "reviewed");
        assertThat(report.getStatus()).isEqualTo(ReportStatus.PROCESSED);
        assertThat(report.getAdmin()).isSameAs(admin);
        assertThat(report.getProcessedAt()).isNotNull();
        assertThatIllegalStateException().isThrownBy(() -> report.dismiss(admin, "second review"));
    }

    @Test void cannotProcessIntoPending() {
        var report = Report.builder().build();
        assertThatIllegalStateException().isThrownBy(() -> report.processReport(null, "note", ReportStatus.PENDING));
    }
}
