package com.universe.trust.entity;

import com.universe.report.entity.Report;
import com.universe.trade.entity.Trade;
import com.universe.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "trust_histories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class TrustHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "trust_history_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trade_id")
    private Trade trade;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id")
    private Report report;

    @Column(name = "before_score", nullable = false)
    private Integer beforeScore;

    @Column(name = "change_amount", nullable = false)
    private Integer changeAmount;

    @Column(name = "after_score", nullable = false)
    private Integer afterScore;

    @Column(nullable = false, length = 100)
    private String reason;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public TrustHistory(User user, Trade trade, Report report, Integer beforeScore, Integer changeAmount, Integer afterScore, String reason) {
        this.user = user;
        this.trade = trade;
        this.report = report;
        this.beforeScore = beforeScore;
        this.changeAmount = changeAmount;
        this.afterScore = afterScore;
        this.reason = reason;
    }
}
