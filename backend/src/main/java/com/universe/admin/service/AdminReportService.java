package com.universe.admin.service;

import com.universe.admin.dto.request.*;
import com.universe.admin.dto.response.*;
import com.universe.report.dto.response.*;
import com.universe.report.entity.*;
import com.universe.report.repository.*;
import com.universe.report.service.*;
import com.universe.trust.service.TrustScoreService;
import com.universe.user.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import static com.universe.report.service.ModerationException.Code.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminReportService {
    private final ModerationAccessService access;
    private final ReportRepository reports;
    private final ReportEvidenceRepository evidences;
    private final ModerationUserRepository users;
    private final TrustScoreService trust;
    private final AdminSanctionService sanctions;
    private final ReportSuspensionPolicy suspensionPolicy;

    public AdminReportDetailResponse getDetail(Long authenticatedAdminId, Long reportId) {
        access.requireAdmin(authenticatedAdminId);
        Report r = reports.findById(reportId).orElseThrow(() -> new ModerationException(REPORT_NOT_FOUND));
        return new AdminReportDetailResponse(ReportResponse.from(r), r.getReporter().getId(), r.getDescription(),
                r.getAdmin() == null ? null : r.getAdmin().getId(), r.getAdminNote(), AdminUserResponse.from(r.getTargetUser()),
                r.getTrade() == null ? null : AdminTradeSummaryResponse.from(r.getTrade()),
                evidences.findByReportIdOrderByIdAsc(reportId).stream().map(ReportEvidenceResponse::from).toList());
    }

    @Transactional
    public ReportResponse dismiss(Long authenticatedAdminId, Long reportId, ReportDismissRequest request) {
        User admin = access.requireAdmin(authenticatedAdminId);
        Report report = pendingReport(reportId);
        requireIndependentAdmin(admin, report);
        report.dismiss(admin, request.adminNote());
        return ReportResponse.from(report);
    }

    @Transactional
    public ReportProcessResponse approve(Long authenticatedAdminId, Long reportId, ReportApproveRequest request) {
        User admin = access.requireAdmin(authenticatedAdminId);
        Report report = pendingReport(reportId);
        requireIndependentAdmin(admin, report);
        User target = users.findLockedById(report.getTargetUser().getId())
                .orElseThrow(() -> new ModerationException(USER_NOT_FOUND));
        if (target.getRole() == UserRole.ADMIN || target.getAccountStatus() == AccountStatus.DELETED)
            throw new ModerationException(FORBIDDEN);
        var endAt = request.sanctionType() == SanctionType.SUSPENSION ? suspensionPolicy.endAt() : null;
        report.approve(admin, request.adminNote());
        trust.confirmReport(report);
        UserSanction sanction = request.sanctionType() == null ? null : sanctions.impose(admin, target, report,
                request.sanctionType(), request.adminNote(), endAt);
        return new ReportProcessResponse(ReportResponse.from(report), target.getTrustScore(),
                sanction == null ? null : UserSanctionResponse.from(sanction));
    }

    private Report pendingReport(Long reportId) {
        Report report = reports.findLockedById(reportId).orElseThrow(() -> new ModerationException(REPORT_NOT_FOUND));
        if (report.getStatus() != ReportStatus.PENDING) throw new ModerationException(REPORT_ALREADY_PROCESSED);
        return report;
    }

    private void requireIndependentAdmin(User admin, Report report) {
        if (Objects.equals(admin.getId(), report.getReporter().getId())
                || Objects.equals(admin.getId(), report.getTargetUser().getId())) throw new ModerationException(FORBIDDEN);
    }
}
