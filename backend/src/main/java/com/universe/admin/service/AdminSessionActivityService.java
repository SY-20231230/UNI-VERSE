package com.universe.admin.service;

import com.universe.auth.service.LoginSessionService;
import com.universe.report.service.ModerationAccessService;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminSessionActivityService {
    private final ModerationAccessService access;
    private final LoginSessionService sessionService;

    public byte[] exportCsv(Long authenticatedAdminId, LocalDateTime now) {
        access.requireAdmin(authenticatedAdminId);
        sessionService.expireInactive(now);
        
        String csv = "\uFEFF안내 메시지\r\n세션 로그가 파일 시스템/S3 기반으로 마이그레이션 되었습니다. 로그 파일은 개별 저장(S3 또는 uploads 폴더)됩니다.\r\n";
        return csv.getBytes(StandardCharsets.UTF_8);
    }
}