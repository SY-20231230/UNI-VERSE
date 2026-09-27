package com.universe.ai.dto.response;

import com.universe.ai.entity.AiAnalysisResult;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiRiskResponse {
    private AiAnalysisResult result;
    private Double riskScore;
    private List<String> detectedTerms;
    private String message;
    private String categoryHint;
}
