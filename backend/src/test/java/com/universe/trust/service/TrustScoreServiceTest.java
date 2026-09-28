package com.universe.trust.service;

import com.universe.market.entity.TradeStatus;
import com.universe.report.entity.Report;
import com.universe.report.entity.ReportType;
import com.universe.report.entity.SanctionType;
import com.universe.report.entity.UserSanction;
import com.universe.report.repository.ModerationUserRepository;
import com.universe.report.service.ModerationException;
import com.universe.trade.entity.Trade;
import com.universe.trust.entity.TrustHistory;
import com.universe.trust.repository.TrustHistoryRepository;
import com.universe.trust.repository.TrustTradeRepository;
import com.universe.user.entity.AccountStatus;
import com.universe.user.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrustScoreServiceTest {
    @Mock ModerationUserRepository users;
    @Mock TrustHistoryRepository histories;
    @Mock TrustTradeRepository trades;
    @Mock TrustScorePolicy policy;
    @InjectMocks TrustScoreService service;

    @Test void initializesNewUserAtFiftyAndRecordsTheChange() {
        User user = user(1L, 0);
        when(users.findLockedById(1L)).thenReturn(Optional.of(user));
        when(histories.existsByUserId(1L)).thenReturn(false);

        service.initializeNewUser(1L);

        assertThat(user.getTrustScore()).isEqualTo(50);
        ArgumentCaptor<TrustHistory> saved = ArgumentCaptor.forClass(TrustHistory.class);
        verify(histories).save(saved.capture());
        assertThat(saved.getValue().getBeforeScore()).isZero();
        assertThat(saved.getValue().getChangeAmount()).isEqualTo(50);
        assertThat(saved.getValue().getAfterScore()).isEqualTo(50);
        assertThat(saved.getValue().getReason()).isEqualTo("INITIALIZED");
    }

    @Test void initializationIsIdempotentWhenHistoryAlreadyExists() {
        User user = user(1L, 50);
        when(users.findLockedById(1L)).thenReturn(Optional.of(user));
        when(histories.existsByUserId(1L)).thenReturn(true);

        service.initializeNewUser(1L);

        assertThat(user.getTrustScore()).isEqualTo(50);
        verify(histories, never()).save(any());
    }

    @Test void initializationRejectsAnUnexplainedExistingScore() {
        User user = user(1L, 20);
        when(users.findLockedById(1L)).thenReturn(Optional.of(user));
        when(histories.existsByUserId(1L)).thenReturn(false);

        assertCode(() -> service.initializeNewUser(1L), ModerationException.Code.INVALID_SCORE_STATE);
        verify(histories, never()).save(any());
    }

    @Test void confirmedReportAloneDoesNotChangeScore() {
        User target = user(2L, 80);
        Report report = Report.builder().reporter(user(1L, 50)).targetUser(target)
                .reportType(ReportType.SCAM).description("confirmed").build();
        ReflectionTestUtils.setField(report, "id", 7L);
        report.approve(user(3L, 50), "reviewed");

        service.confirmReport(report);

        assertThat(target.getTrustScore()).isEqualTo(80);
        verifyNoInteractions(users, histories);
    }

    @Test void suspensionDeductsTwoPointsPerDayAndBanSetsZero() {
        User target = user(2L, 50);
        LocalDateTime start = LocalDateTime.now();
        UserSanction suspension = UserSanction.builder().user(target).admin(user(1L, 50))
                .sanctionType(SanctionType.SUSPENSION).reason("suspended").startAt(start).endAt(start.plusDays(3)).build();
        ReflectionTestUtils.setField(suspension, "id", 10L);
        when(users.findLockedById(2L)).thenReturn(Optional.of(target));
        when(policy.afterSuspension(50, 3)).thenReturn(44);

        service.applySuspension(suspension);
        assertThat(target.getTrustScore()).isEqualTo(44);

        UserSanction ban = UserSanction.builder().user(target).admin(user(1L, 50))
                .sanctionType(SanctionType.BAN).reason("banned").build();
        ReflectionTestUtils.setField(ban, "id", 11L);
        service.applyBan(ban);
        assertThat(target.getTrustScore()).isEqualTo(0);
    }

    @Test void pendingReportCannotChangeTrustScore() {
        Report pending = Report.builder().reporter(user(1L, 50)).targetUser(user(2L, 50))
                .reportType(ReportType.SCAM).description("pending").build();

        assertCode(() -> service.confirmReport(pending), ModerationException.Code.REPORT_ALREADY_PROCESSED);
        verifyNoInteractions(users, histories);
    }

    @Test void warningUsesPolicyAndCannotBeAppliedWithoutPersistedWarningSanction() {
        User target = user(2L, 50);
        UserSanction warning = UserSanction.builder().user(target).admin(user(1L, 50))
                .sanctionType(SanctionType.WARNING).reason("warning").build();

        assertCode(() -> service.applyWarning(warning), ModerationException.Code.INVALID_SANCTION);

        ReflectionTestUtils.setField(warning, "id", 8L);
        when(users.findLockedById(2L)).thenReturn(Optional.of(target));
        when(histories.existsByUserIdAndReason(2L, "WARNING:8")).thenReturn(false);
        when(policy.afterWarning(50)).thenReturn(40);
        service.applyWarning(warning);

        assertThat(target.getTrustScore()).isEqualTo(40);
        verify(policy).afterWarning(50);
        verify(histories).save(any(TrustHistory.class));
    }

    @Test void expiredSuspensionReleaseKeepsDeductedScore() {
        User target = user(2L, 10);
        UserSanction suspension = UserSanction.builder().user(target).admin(user(1L, 50))
                .sanctionType(SanctionType.SUSPENSION).reason("suspended")
                .endAt(LocalDateTime.now().minusMinutes(1)).build();
        ReflectionTestUtils.setField(suspension, "id", 9L);
        when(users.findLockedById(2L)).thenReturn(Optional.of(target));
        when(histories.existsByUserIdAndReason(2L, "SUSPENSION_RELEASED:9")).thenReturn(false);

        service.releaseSuspension(suspension, LocalDateTime.now());

        assertThat(target.getTrustScore()).isEqualTo(10);
        ArgumentCaptor<TrustHistory> saved = ArgumentCaptor.forClass(TrustHistory.class);
        verify(histories).save(saved.capture());
        assertThat(saved.getValue().getReason()).isEqualTo("SUSPENSION_RELEASED:9");
    }

    @Test void incompleteTradeCannotCreditEitherParticipant() {
        Trade trade = trade(11L, user(1L, 50), user(2L, 50), false);
        when(trades.findLockedById(11L)).thenReturn(Optional.of(trade));

        assertCode(() -> service.recordCompletedTrade(11L), ModerationException.Code.TRADE_NOT_COMPLETED);
        verifyNoInteractions(users, histories, policy);
    }

    @Test void completedTradeLocksUsersInIdOrderAndSkipsAlreadyCreditedTrade() {
        User highIdSeller = user(9L, 50);
        User lowIdBuyer = user(2L, 50);
        Trade trade = trade(11L, highIdSeller, lowIdBuyer, true);
        when(trades.findLockedById(11L)).thenReturn(Optional.of(trade));
        when(users.findLockedById(2L)).thenReturn(Optional.of(lowIdBuyer));
        when(users.findLockedById(9L)).thenReturn(Optional.of(highIdSeller));
        when(histories.existsByUserIdAndTradeId(2L, 11L)).thenReturn(true);
        when(histories.existsByUserIdAndTradeId(9L, 11L)).thenReturn(true);

        service.recordCompletedTrade(11L);

        InOrder order = inOrder(users);
        order.verify(users).findLockedById(2L);
        order.verify(users).findLockedById(9L);
        verify(histories, never()).save(any());
        verifyNoInteractions(policy);
    }

    @Test void completedTradeRequiresAnInitializationOrRecoveryAnchor() {
        User seller = user(1L, 50);
        User buyer = user(2L, 50);
        Trade trade = trade(11L, seller, buyer, true);
        when(trades.findLockedById(11L)).thenReturn(Optional.of(trade));
        when(users.findLockedById(1L)).thenReturn(Optional.of(seller));
        when(histories.existsByUserIdAndTradeId(1L, 11L)).thenReturn(false);
        when(histories.findLatestAnchor(1L, PageRequest.of(0, 1))).thenReturn(List.of());

        assertCode(() -> service.recordCompletedTrade(11L), ModerationException.Code.SCORE_NOT_INITIALIZED);
        verify(histories, never()).save(any());
    }

    private User user(long id, int score) {
        User user = User.builder().email(id + "@test.example").password("secret")
                .name("name").nickname("nick").build();
        ReflectionTestUtils.setField(user, "id", id);
        user.addTrustScore(score);
        user.updateAccountStatus(AccountStatus.ACTIVE);
        return user;
    }

    private Trade trade(long id, User seller, User buyer, boolean complete) {
        Trade trade = Trade.builder().seller(seller).buyer(buyer).listedPrice(1000L).build();
        ReflectionTestUtils.setField(trade, "id", id);
        if (complete) {
            trade.confirmBySeller();
            trade.confirmByBuyer();
            assertThat(trade.getStatus()).isEqualTo(TradeStatus.COMPLETED);
        }
        return trade;
    }

    private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action,
                            ModerationException.Code code) {
        assertThatThrownBy(action).isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode()).isEqualTo(code);
    }
}
