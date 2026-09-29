package com.universe.ai.entity;

import com.universe.market.entity.MarketItem;
import com.universe.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_risk_analyses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class AiRiskAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "analysis_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    private MarketItem item;

    @Column(name = "input_text", nullable = false, columnDefinition = "TEXT")
    private String inputText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiAnalysisResult result;

    @Column(name = "risk_score", precision = 5, scale = 4)
    private BigDecimal riskScore;

    @Column(name = "detected_types", columnDefinition = "JSON")
    private String detectedTypes;

    @Column(name = "model_version", length = 50)
    private String modelVersion;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public AiRiskAnalysis(User user, MarketItem item, String inputText, AiAnalysisResult result, BigDecimal riskScore, String detectedTypes, String modelVersion) {
        this.user = user;
        this.item = item;
        this.inputText = inputText;
        this.result = result;
        this.riskScore = riskScore;
        this.detectedTypes = detectedTypes;
        this.modelVersion = modelVersion;
    }
}
