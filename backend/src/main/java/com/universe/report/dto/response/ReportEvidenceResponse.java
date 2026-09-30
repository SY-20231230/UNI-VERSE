package com.universe.report.dto.response;

import com.universe.report.entity.ReportEvidence;
import com.universe.file.service.FileService;
import java.time.LocalDateTime;

public record ReportEvidenceResponse(Long evidenceId, String fileUrl, LocalDateTime createdAt) {
    public static ReportEvidenceResponse from(ReportEvidence evidence) {
        return new ReportEvidenceResponse(evidence.getId(), evidence.getFileUrl(), evidence.getCreatedAt());
    }
    
    public static ReportEvidenceResponse from(ReportEvidence evidence, FileService fileService) {
        return new ReportEvidenceResponse(evidence.getId(), fileService.getFileUrl(evidence.getFileUrl()), evidence.getCreatedAt());
    }
}
