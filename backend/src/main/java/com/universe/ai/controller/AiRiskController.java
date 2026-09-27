package com.universe.ai.controller;

import com.universe.ai.dto.request.AiRiskAnalyzeRequest;
import com.universe.ai.dto.response.AiRiskResponse;
import com.universe.ai.service.AiRiskService;
import com.universe.global.common.ApiResponse;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai/risk")
@RequiredArgsConstructor
public class AiRiskController {

    private final AiRiskService aiRiskService;
    private final UserRepository userRepository;

    @PostMapping("/analyze")
    public ApiResponse<AiRiskResponse> analyzeRisk(
            @AuthenticationPrincipal Long userId,
            @RequestBody AiRiskAnalyzeRequest request) {
        
        User user = userRepository.findById(userId).orElse(null);
        
        // Controller에서 명시적으로 호출할 때는 차단 시나리오 예외를 던지지 않고 
        // 응답 자체에 위험 점수를 포함해서 넘겨줄 수 있도록 분기 처리를 고려하거나,
        // 현재는 서비스의 반환값을 그대로 감싸서 내보냅니다.
        AiRiskResponse response = aiRiskService.analyzeAndSave(
                request.getTitle(), request.getDescription(), user, null);
                
        return ApiResponse.success(response);
    }
}
