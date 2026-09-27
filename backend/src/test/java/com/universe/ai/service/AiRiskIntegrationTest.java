package com.universe.ai.service;

import com.universe.ai.dto.response.AiRiskResponse;
import com.universe.ai.entity.AiAnalysisResult;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
public class AiRiskIntegrationTest {

    @Autowired
    private AiRiskService aiRiskService;

    @Test
    @DisplayName("1. 정상 판매글 테스트")
    void testNormal() {
        AiRiskResponse response = aiRiskService.analyzeAndSave("아이패드 에어 판매", "생활기스 조금 있고 학교 정문에서 직거래 가능합니다.", null, null);
        assertThat(response.getResult()).isEqualTo(AiAnalysisResult.SAFE);
    }

    @Test
    @DisplayName("2. 외부 메신저 유도 테스트")
    void testExternalMessenger() {
        AiRiskResponse response = aiRiskService.analyzeAndSave("아이패드 에어 판매", "카톡으로 연락주세요.", null, null);
        assertThat(response.getResult()).isEqualTo(AiAnalysisResult.FRAUD_SUSPECTED);
        assertThat(response.getMessage()).contains("카톡"); // 또는 에러 메시지 내용 검증
    }

    @Test
    @DisplayName("3. 선입금 요구 테스트")
    void testPrepayment() {
        AiRiskResponse response = aiRiskService.analyzeAndSave("아이패드 에어 판매", "예약하려면 선입금 2만원 보내주세요.", null, null);
        assertThat(response.getResult()).isEqualTo(AiAnalysisResult.FRAUD_SUSPECTED);
    }

    @Test
    @DisplayName("4. 택배 유도 테스트")
    void testDelivery() {
        AiRiskResponse response = aiRiskService.analyzeAndSave("아이패드 에어 판매", "택배만 가능합니다.", null, null);
        assertThat(response.getResult()).isEqualTo(AiAnalysisResult.FRAUD_SUSPECTED);
    }
}
