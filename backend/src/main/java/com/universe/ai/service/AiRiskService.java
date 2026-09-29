package com.universe.ai.service;

import tools.jackson.databind.ObjectMapper;
import com.universe.ai.dto.request.AiRiskPredictRequest;
import com.universe.ai.dto.response.AiRiskPredictResponse;
import com.universe.ai.entity.AiAnalysisResult;
import com.universe.ai.entity.AiRiskAnalysis;
import com.universe.ai.repository.AiRiskAnalysisRepository;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.market.entity.MarketItem;
import com.universe.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiRiskService {

    private final AiRiskClient aiRiskClient;
    private final AiRiskAnalysisRepository analysisRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public com.universe.ai.dto.response.AiRiskResponse analyzeAndSave(String title, String description, User user, MarketItem item) {
        AiRiskPredictRequest request = new AiRiskPredictRequest(title, description);
        
        // 1. FastAPI 통신
        AiRiskPredictResponse response = aiRiskClient.predict(request);
        
        if (response == null || response.getLabel() == null) {
            throw new BusinessException(ErrorCode.AI_SERVER_ERROR);
        }

        AiAnalysisResult result = "BLOCK".equalsIgnoreCase(response.getLabel()) 
                ? AiAnalysisResult.FRAUD_SUSPECTED 
                : AiAnalysisResult.SAFE;

        String detectedTypesJson = null;
        try {
            if (response.getDetected_terms() != null) {
                detectedTypesJson = objectMapper.writeValueAsString(response.getDetected_terms());
            }
        } catch (Exception e) {
            log.warn("Failed to serialize detected terms", e);
        }

        // 2. 분석 결과 DB 저장
        AiRiskAnalysis analysis = AiRiskAnalysis.builder()
                .user(user)
                .item(item)
                .inputText(title + " " + description)
                .result(result)
                .riskScore(response.getProbability() != null ? BigDecimal.valueOf(response.getProbability()) : BigDecimal.ZERO)
                .detectedTypes(detectedTypesJson)
                .modelVersion("v1")
                .build();

        analysisRepository.save(analysis);

        return com.universe.ai.dto.response.AiRiskResponse.builder()
                .result(result)
                .riskScore(response.getProbability())
                .detectedTerms(response.getDetected_terms())
                .message(response.getMessage())
                .categoryHint(response.getCategory_hint())
                .build();
    }
}
