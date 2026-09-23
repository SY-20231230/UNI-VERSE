package com.universe.ai.service;

import com.universe.ai.dto.AiAnalysisRequest;
import com.universe.ai.dto.AiAnalysisResponse;
import com.universe.ai.entity.AiAnalysisResult;
import com.universe.ai.entity.AiRiskAnalysis;
import com.universe.ai.repository.AiRiskAnalysisRepository;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.market.entity.MarketItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class AiRiskService {

    private final WebClient aiWebClient;
    private final AiRiskAnalysisRepository analysisRepository;

    @Transactional
    public void analyzeMarketItem(MarketItem item) {
        AiAnalysisRequest request = new AiAnalysisRequest(item.getTitle(), item.getDescription());

        try {
            AiAnalysisResponse response = aiWebClient.post()
                    .uri("/api/v1/analyze/fraud")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiAnalysisResponse.class)
                    .block();

            if (response != null) {
                AiRiskAnalysis analysis = AiRiskAnalysis.builder()
                        .user(item.getSeller())
                        .item(item)
                        .inputText(item.getTitle() + " " + item.getDescription())
                        .result(response.getResult())
                        .riskScore(response.getFraudProbability() != null ? BigDecimal.valueOf(response.getFraudProbability()) : BigDecimal.ZERO)
                        .detectedTypes(response.getDetectedTypes())
                        .modelVersion(response.getModelVersion())
                        .build();

                analysisRepository.save(analysis);
                item.updateAiStatus(response.getResult());

                if (response.getResult() == AiAnalysisResult.FRAUD_SUSPECTED) {
                    throw new BusinessException(ErrorCode.FRAUD_SUSPECTED);
                }
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            // 통신 실패나 기타 에러 시 게시글 등록을 막지 않고 보류(PENDING) 상태로 둠
            item.updateAiStatus(AiAnalysisResult.PENDING);
        }
    }
}
