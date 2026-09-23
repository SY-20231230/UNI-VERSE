package com.universe.report.service;

import com.universe.admin.dto.request.*;
import com.universe.admin.service.*;
import com.universe.report.dto.request.ReportCreateRequest;
import com.universe.report.entity.*;
import com.universe.report.repository.*;
import com.universe.trust.entity.TrustHistory;
import com.universe.trust.repository.TrustHistoryRepository;
import com.universe.trust.service.*;
import com.universe.user.entity.*;
import com.universe.user.service.MyPageService;
import com.universe.market.entity.*;
import com.universe.school.entity.School;
import com.universe.trade.entity.Trade;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDateTime;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false",
        "spring.sql.init.mode=never", "spring.flyway.enabled=false", "spring.liquibase.enabled=false",
        "report.evidence.base-url=https://evidence.example.com/reports/", "admin.report.suspension-days=3"})
@Import({ReportReferenceRepository.class, ModerationAccessService.class, ReportEvidencePolicy.class,
        ReportService.class, TrustScoreService.class, TrustScorePolicy.class, AdminReportService.class,
        AdminSanctionService.class, ReportSuspensionPolicy.class, AdminUserService.class, SuspensionReleaseService.class, MyPageService.class})
class ModerationIntegrationTest {
    @Autowired EntityManager em;
    @Autowired ReportService reportService;
    @Autowired ReportRepository reports;
    @Autowired AdminReportService adminReports;
    @Autowired AdminSanctionService adminSanctions;
    @Autowired AdminUserService adminUsers;
    @Autowired TrustScoreService trust;
    @Autowired TrustHistoryRepository histories;
    @Autowired UserSanctionRepository sanctions;
    @Autowired MyPageService myPage;
    @Autowired SuspensionReleaseService suspensionRelease;
    User seller, buyer, admin;
    School school;

    @BeforeEach void setup() {
        school = School.builder().schoolName("Test school").emailDomain("test.example").build();
        em.persist(school);
        seller = createUser("seller"); buyer = createUser("buyer"); admin = createUser("admin");
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        em.flush();
        trust.initializeNewUser(seller.getId()); trust.initializeNewUser(buyer.getId());
        em.flush();
    }

    User createUser(String label) {
        var user = User.builder().email(label + "@test.example").password("test-only").name(label).nickname(label).build();
        user.verifySchool(school); em.persist(user); return user;
    }

    Trade completeTrade() {
        var item = MarketItem.builder().seller(seller).school(school).title("book")
                .category(ItemCategory.values()[0]).itemCondition(ItemCondition.values()[0])
                .purchasePrice(20000L).listedPrice(10000L).description("book").build();
        em.persist(item);
        var trade = Trade.builder().item(item).seller(seller).buyer(buyer).listedPrice(10000L).build();
        trade.confirmBySeller(); trade.confirmByBuyer(); em.persist(trade); em.flush();
        trust.recordCompletedTrade(trade.getId()); em.flush(); return trade;
    }

    Long reportSeller() {
        var result = reportService.create(buyer.getId(), new ReportCreateRequest(seller.getId(), null, null, null,
                ReportType.SCAM, "description", List.of("https://evidence.example.com/reports/receipt.png")));
        em.flush(); return result.reportId();
    }

    @Test void registrationKeepsScoreAndEvidenceAndRejectsOtherReaders() {
        Long reportId = reportSeller();
        assertThat(seller.getTrustScore()).isEqualTo(50);
        assertThat(reportService.getMine(buyer.getId(), reportId).evidences()).hasSize(1);
        assertThatThrownBy(() -> reportService.getMine(seller.getId(), reportId)).isInstanceOf(ModerationException.class);
    }

    @Test void bothSidesReceiveMilestonesAndDuplicateDeliveryDoesNotCount() {
        Trade last = null;
        for (int i = 0; i < 5; i++) last = completeTrade();
        assertThat(seller.getTrustScore()).isEqualTo(60);
        assertThat(buyer.getTrustScore()).isEqualTo(60);
        trust.recordCompletedTrade(last.getId());
        assertThat(seller.getTrustScore()).isEqualTo(60);
        assertThat(histories.findByUserId(seller.getId(), PageRequest.of(0, 30)).getTotalElements()).isEqualTo(6);
    }

    @Test void approvalAndWarningDoNotDoubleDeductAndRecoveryRestarts() {
        Long id = reportSeller();
        adminReports.approve(admin.getId(), id, new ReportApproveRequest("confirmed", SanctionType.WARNING));
        em.flush();
        assertThat(seller.getTrustScore()).isEqualTo(30);
        for (int i = 0; i < 9; i++) completeTrade();
        assertThat(seller.getTrustScore()).isEqualTo(30);
        completeTrade();
        assertThat(seller.getTrustScore()).isEqualTo(50);
        for (int i = 0; i < 5; i++) completeTrade();
        assertThat(seller.getTrustScore()).isEqualTo(60);
        assertThat(reports.findById(id).orElseThrow().getStatus()).isEqualTo(ReportStatus.PROCESSED);
    }

    @Test void repeatedReportResetsRecoveryCounter() {
        adminReports.approve(admin.getId(), reportSeller(), new ReportApproveRequest("first", null)); em.flush();
        for (int i = 0; i < 9; i++) completeTrade();
        adminReports.approve(admin.getId(), reportSeller(), new ReportApproveRequest("second", null)); em.flush();
        completeTrade();
        assertThat(seller.getTrustScore()).isEqualTo(30);
        for (int i = 0; i < 9; i++) completeTrade();
        assertThat(seller.getTrustScore()).isEqualTo(50);
    }

    @Test void standaloneWarningDeductsTen() {
        adminSanctions.create(admin.getId(), seller.getId(), new UserSanctionCreateRequest(SanctionType.WARNING, "warning", null, null));
        assertThat(seller.getTrustScore()).isEqualTo(40);
    }

    @Test void suspensionReleaseUsesOptionAAndCannotReleaseEarly() {
        var response = adminSanctions.create(admin.getId(), seller.getId(), new UserSanctionCreateRequest(
                SanctionType.SUSPENSION, "temporary", LocalDateTime.now().plusDays(3), null));
        assertThat(seller.getAccountStatus()).isEqualTo(AccountStatus.SUSPENDED);
        var sanction = sanctions.findById(response.sanctionId()).orElseThrow();
        ReflectionTestUtils.setField(sanction, "endAt", LocalDateTime.now().minusSeconds(1));
        adminUsers.updateStatus(admin.getId(), seller.getId(), new UserStatusUpdateRequest(AccountStatus.ACTIVE)); em.flush();
        assertThat(seller.getTrustScore()).isEqualTo(50);
        for (int i = 0; i < 5; i++) completeTrade();
        assertThat(seller.getTrustScore()).isEqualTo(50);
        completeTrade();
        assertThat(seller.getTrustScore()).isEqualTo(60);
    }

    @Test void suspensionCannotBeReleasedBeforeEnd() {
        adminSanctions.create(admin.getId(), seller.getId(), new UserSanctionCreateRequest(
                SanctionType.SUSPENSION, "temporary", LocalDateTime.now().plusDays(3), null));
        assertThatThrownBy(() -> adminUsers.updateStatus(admin.getId(), seller.getId(),
                new UserStatusUpdateRequest(AccountStatus.ACTIVE))).isInstanceOf(ModerationException.class);
    }

    @Test void expiryQueryAndReleaseAreIdempotent() {
        var response = adminSanctions.create(admin.getId(), seller.getId(), new UserSanctionCreateRequest(
                SanctionType.SUSPENSION, "temporary", LocalDateTime.now().plusDays(3), null));
        var sanction = sanctions.findById(response.sanctionId()).orElseThrow();
        ReflectionTestUtils.setField(sanction, "endAt", LocalDateTime.now().minusSeconds(1)); em.flush();
        assertThat(sanctions.findExpiredUserIds(LocalDateTime.now(), PageRequest.of(0, 100)).getContent())
                .containsExactly(seller.getId());
        assertThat(suspensionRelease.releaseIfExpired(seller.getId(), LocalDateTime.now())).isTrue(); em.flush();
        assertThat(suspensionRelease.releaseIfExpired(seller.getId(), LocalDateTime.now())).isFalse();
        assertThat(sanctions.findExpiredUserIds(LocalDateTime.now(), PageRequest.of(0, 100))).isEmpty();
        assertThat(seller.getTrustScore()).isEqualTo(50);
    }

    @Test void permanentBanCannotBeReactivated() {
        adminSanctions.create(admin.getId(), seller.getId(), new UserSanctionCreateRequest(SanctionType.BAN, "permanent", null, null));
        assertThatThrownBy(() -> adminUsers.updateStatus(admin.getId(), seller.getId(),
                new UserStatusUpdateRequest(AccountStatus.ACTIVE))).isInstanceOf(ModerationException.class);
    }

    @Test void dismissedReportDoesNotChangeScore() {
        Long id = reportSeller();
        adminReports.dismiss(admin.getId(), id, new ReportDismissRequest("insufficient evidence"));
        assertThat(seller.getTrustScore()).isEqualTo(50);
        assertThat(reports.findById(id).orElseThrow().getStatus()).isEqualTo(ReportStatus.REJECTED);
    }

    @Test void secondProcessingIsRejected() {
        Long id = reportSeller();
        adminReports.approve(admin.getId(), id, new ReportApproveRequest("confirmed", null)); em.flush();
        assertThatThrownBy(() -> adminReports.approve(admin.getId(), id, new ReportApproveRequest("again", null)))
                .isInstanceOf(ModerationException.class);
    }

    @Test void ordinaryUserCannotProcessReports() {
        Long id = reportSeller();
        assertThatThrownBy(() -> adminReports.approve(buyer.getId(), id, new ReportApproveRequest("confirmed", null)))
                .isInstanceOf(ModerationException.class);
    }

    @Test void myPageCountsOnlyOwnedItemsAndCompletedTrades() {
        completeTrade();
        assertThat(myPage.getSummary(seller.getId()).marketItemCount()).isEqualTo(1);
        assertThat(myPage.getSummary(buyer.getId()).marketItemCount()).isZero();
        assertThat(myPage.getSummary(buyer.getId()).completedTradeCount()).isEqualTo(1);
        assertThat(myPage.findItems(buyer.getId(), null, PageRequest.of(0, 20))).isEmpty();
    }

    @Test void userDetailHasNoEntityOrPasswordAndIncludesActivityPreviews() {
        completeTrade(); reportSeller();
        var detail = adminUsers.getDetail(admin.getId(), seller.getId());
        assertThat(detail.tradeCount()).isEqualTo(1);
        assertThat(detail.reportCount()).isEqualTo(1);
        assertThat(detail.recentTrades()).hasSize(1);
    }
}
