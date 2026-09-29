package com.universe.ai.service;

import com.universe.ai.dto.response.AiRiskResponse;
import com.universe.ai.dto.response.AiRiskPredictResponse;
import com.universe.ai.entity.AiAnalysisResult;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class AiRiskIntegrationTest {

    @Autowired
    private AiRiskService aiRiskService;

    @MockitoBean
    private AiRiskClient aiRiskClient;

    @Autowired
    private UserRepository userRepository;

    private User createTestUser() {
        String uniqueId = UUID.randomUUID().toString();
        return userRepository.save(User.builder()
                .email("ai-risk-" + uniqueId + "@test.example")
                .password("test-only")
                .name("AI Risk Test")
                .nickname("AI Risk Test")
                .build());
    }

    @Test
    @DisplayName("1. 정상 판매글 테스트")
    void testNormal() {
        mockPrediction("SAFE", 0.02, List.of(), "안전한 거래 문구입니다.");
        User testUser = createTestUser();

        AiRiskResponse response = aiRiskService.analyzeAndSave("아이패드 에어 판매", "생활기스 조금 있고 학교 정문에서 직거래 가능합니다.", testUser, null);

        assertThat(response.getResult()).isEqualTo(AiAnalysisResult.SAFE);
        assertThat(response.getRiskScore()).isEqualTo(0.02);
    }

    @Test
    @DisplayName("2. 외부 메신저 유도 테스트")
    void testExternalMessenger() {
        mockPrediction("BLOCK", 0.96, List.of("카톡"), "카톡 유도 문구가 감지되었습니다.");
        User testUser = createTestUser();

        AiRiskResponse response = aiRiskService.analyzeAndSave("아이패드 에어 판매", "카톡으로 연락주세요.", testUser, null);

        assertThat(response.getResult()).isEqualTo(AiAnalysisResult.FRAUD_SUSPECTED);
        assertThat(response.getDetectedTerms()).contains("카톡");
        assertThat(response.getMessage()).contains("카톡");
    }

    @Test
    @DisplayName("3. 선입금 요구 테스트")
    void testPrepayment() {
        mockPrediction("BLOCK", 0.91, List.of("선입금"), "선입금 요구 문구가 감지되었습니다.");
        User testUser = createTestUser();

        AiRiskResponse response = aiRiskService.analyzeAndSave("아이패드 에어 판매", "예약하려면 선입금 2만원 보내주세요.", testUser, null);

        assertThat(response.getResult()).isEqualTo(AiAnalysisResult.FRAUD_SUSPECTED);
    }

    @Test
    @DisplayName("4. 택배 유도 테스트")
    void testDelivery() {
        mockPrediction("BLOCK", 0.89, List.of("택배만"), "택배 유도 문구가 감지되었습니다.");
        User testUser = createTestUser();

        AiRiskResponse response = aiRiskService.analyzeAndSave("아이패드 에어 판매", "택배만 가능합니다.", testUser, null);

        assertThat(response.getResult()).isEqualTo(AiAnalysisResult.FRAUD_SUSPECTED);
    }

    private void mockPrediction(String label, double probability, List<String> detectedTerms, String message) {
        AiRiskPredictResponse prediction = mock(AiRiskPredictResponse.class);
        when(prediction.getLabel()).thenReturn(label);
        when(prediction.getProbability()).thenReturn(probability);
        when(prediction.getDetected_terms()).thenReturn(detectedTerms);
        when(prediction.getMessage()).thenReturn(message);
        when(aiRiskClient.predict(any())).thenReturn(prediction);
    }
}
