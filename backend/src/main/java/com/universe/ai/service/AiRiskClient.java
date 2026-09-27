package com.universe.ai.service;

import com.universe.ai.dto.request.AiRiskPredictRequest;
import com.universe.ai.dto.response.AiRiskPredictResponse;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class AiRiskClient {

    private final WebClient aiWebClient;

    public AiRiskPredictResponse predict(AiRiskPredictRequest request) {
        try {
            return aiWebClient.post()
                    .uri("/predict")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiRiskPredictResponse.class)
                    .block();
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.AI_SERVER_ERROR);
        }
    }
}
