package com.universe.ai.dto;

import com.universe.ai.entity.AiAnalysisResult;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AiAnalysisResponse {
    private AiAnalysisResult result;
    private Double fraudProbability;
    private String detectedTypes;
    private String modelVersion;
}
