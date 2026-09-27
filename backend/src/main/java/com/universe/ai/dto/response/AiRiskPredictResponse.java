package com.universe.ai.dto.response;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.List;

@Getter
@NoArgsConstructor
@ToString
public class AiRiskPredictResponse {

    private String label;
    private Double probability;
    private Double threshold;

    private String category_hint;

    private List<String> detected_terms;

    private List<String> rule_hits;

    private String message;
}
