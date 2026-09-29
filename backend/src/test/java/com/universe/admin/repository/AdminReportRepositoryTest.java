package com.universe.admin.repository;

import com.universe.admin.dto.request.AdminReportSearchCondition;
import com.universe.report.entity.*;
import com.universe.user.entity.User;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.*;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.sql.init.mode=never", "spring.jpa.show-sql=false"})
class AdminReportRepositoryTest {
    @Autowired EntityManager em;
    @Autowired AdminReportRepository reports;
    User reporter, target, other;
    Report first, second, third;
    final LocalDateTime time = LocalDateTime.of(2026, 9, 23, 12, 0);

    @BeforeEach void setup() {
        reporter = user("reporter"); target = user("target"); other = user("other");
        first = report(target, ReportType.SCAM, time.minusDays(2));
        second = report(target, ReportType.SPAM, time);
        third = report(other, ReportType.SCAM, time);
        third.dismiss(reporter, "reviewed"); em.flush(); em.clear();
    }
    User user(String name) {
        var user = User.builder().email(name + "@test.example").password("test").name(name).nickname(name).build();
        em.persist(user); return user;
    }
    Report report(User target, ReportType type, LocalDateTime createdAt) {
        var report = Report.builder().reporter(reporter).targetUser(target).reportType(type).description("Test").build();
        em.persist(report); em.flush();
        // SQL through JPQL in the fixture controls auditing timestamps without modifying production entities.
        em.createQuery("update Report r set r.createdAt = :time where r.id = :id")
                .setParameter("time", createdAt).setParameter("id", report.getId()).executeUpdate();
        return report;
    }
    AdminReportSearchCondition condition(ReportStatus status, ReportType type, Long id, LocalDateTime from, LocalDateTime to) {
        return new AdminReportSearchCondition(status, type, id, from, to);
    }
    @Test void unfilteredProjectionIncludesReportsWithNoOptionalReferences() {
        var page = reports.search(condition(null, null, null, null, null), PageRequest.of(0, 20));
        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getContent()).extracting(r -> r.reportId()).containsExactly(third.getId(), second.getId(), first.getId());
        assertThat(page.getContent()).allSatisfy(r -> assertThat(r.reporterId()).isEqualTo(reporter.getId()));
    }
    @Test void combinesAllOptionalFiltersAndInclusiveTimeBounds() {
        var page = reports.search(condition(ReportStatus.PENDING, ReportType.SPAM, target.getId(), time, time), PageRequest.of(0, 20));
        assertThat(page.getContent()).extracting(r -> r.reportId()).containsExactly(second.getId());
        assertThat(page.getTotalElements()).isEqualTo(1);
    }
    @Test void handlesStatusAndTypeSeparately() {
        assertThat(reports.search(condition(ReportStatus.REJECTED, null, null, null, null), PageRequest.of(0, 20)).getTotalElements()).isEqualTo(1);
        assertThat(reports.search(condition(null, ReportType.SCAM, null, null, null), PageRequest.of(0, 20)).getTotalElements()).isEqualTo(2);
    }
    @Test void ascendingPagingHasStableTiesAndAccurateCount() {
        var page = reports.search(condition(null, null, null, null, null), PageRequest.of(1, 1, Sort.by("createdAt").ascending()));
        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getTotalPages()).isEqualTo(3);
        assertThat(page.getContent()).extracting(r -> r.reportId()).containsExactly(second.getId());
    }
    @Test void emptyPageRetainsMatchingTotal() {
        var page = reports.search(condition(null, null, target.getId(), null, null), PageRequest.of(5, 2));
        assertThat(page.getContent()).isEmpty(); assertThat(page.getTotalElements()).isEqualTo(2);
    }
    @Test void singleTimeBoundsAndNoMatches() {
        assertThat(reports.search(condition(null, null, null, time.minusHours(1), null), PageRequest.of(0, 20)).getTotalElements()).isEqualTo(2);
        assertThat(reports.search(condition(null, null, null, null, time.minusHours(1)), PageRequest.of(0, 20)).getTotalElements()).isEqualTo(1);
        assertThat(reports.search(condition(null, null, null, time.plusDays(1), null), PageRequest.of(0, 20))).isEmpty();
    }
}
