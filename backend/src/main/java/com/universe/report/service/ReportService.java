package com.universe.report.service;

import com.universe.report.dto.request.ReportCreateRequest;
import com.universe.report.dto.response.*;
import com.universe.report.entity.*;
import com.universe.report.repository.*;
import com.universe.user.entity.User;
import com.universe.trade.entity.Trade;
import com.universe.market.entity.MarketItem;
import com.universe.community.entity.CommunityPost;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import static com.universe.report.service.ModerationException.Code.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {
    private final ReportRepository reports;
    private final ReportEvidenceRepository evidences;
    private final ModerationUserRepository users;
    private final ReportReferenceRepository references;
    private final ModerationAccessService access;
    private final ReportEvidencePolicy evidencePolicy;

    @Transactional
    public ReportResponse create(Long authenticatedUserId, ReportCreateRequest request) {
        User reporter = access.requireActiveUser(authenticatedUserId);
        User target = users.findById(request.targetUserId()).orElseThrow(() -> new ModerationException(USER_NOT_FOUND));
        if (Objects.equals(reporter.getId(), target.getId())) throw new ModerationException(INVALID_REPORT_TARGET);
        Trade trade = request.tradeId() == null ? null : references.findTrade(request.tradeId())
                .orElseThrow(() -> new ModerationException(REFERENCE_NOT_FOUND));
        MarketItem item = request.itemId() == null ? null : references.findItem(request.itemId())
                .orElseThrow(() -> new ModerationException(REFERENCE_NOT_FOUND));
        CommunityPost post = request.postId() == null ? null : references.findPost(request.postId())
                .orElseThrow(() -> new ModerationException(REFERENCE_NOT_FOUND));
        validateReferences(reporter, target, trade, item, post);
        evidencePolicy.validate(request.evidences());
        Report report = reports.save(Report.builder().reporter(reporter).targetUser(target)
                .trade(trade).item(item).post(post).reportType(request.reportType())
                .description(request.description()).build());
        evidences.saveAll(request.evidences().stream().distinct()
                .map(url -> ReportEvidence.builder().report(report).fileUrl(url).build()).toList());
        return ReportResponse.from(report);
    }

    public Page<ReportResponse> findMine(Long authenticatedUserId, ReportStatus status, Pageable pageable) {
        access.requireActiveUser(authenticatedUserId);
        Page<Report> page = status == null ? reports.findByReporterId(authenticatedUserId, pageable)
                : reports.findByReporterIdAndStatus(authenticatedUserId, status, pageable);
        return page.map(ReportResponse::from);
    }

    public ReportDetailResponse getMine(Long authenticatedUserId, Long reportId) {
        access.requireActiveUser(authenticatedUserId);
        Report report = reports.findById(reportId).orElseThrow(() -> new ModerationException(REPORT_NOT_FOUND));
        if (!Objects.equals(report.getReporter().getId(), authenticatedUserId)) throw new ModerationException(FORBIDDEN);
        return new ReportDetailResponse(ReportResponse.from(report), report.getDescription(),
                evidences.findByReportIdOrderByIdAsc(reportId).stream().map(ReportEvidenceResponse::from).toList());
    }

    private void validateReferences(User reporter, User target, Trade trade, MarketItem item, CommunityPost post) {
        if (trade != null) {
            boolean opponents = Objects.equals(trade.getSeller().getId(), reporter.getId())
                    && Objects.equals(trade.getBuyer().getId(), target.getId())
                    || Objects.equals(trade.getBuyer().getId(), reporter.getId())
                    && Objects.equals(trade.getSeller().getId(), target.getId());
            if (!opponents || item != null && !Objects.equals(trade.getItem().getId(), item.getId()))
                throw new ModerationException(INVALID_REPORT_TARGET);
        }
        if (item != null && !Objects.equals(item.getSeller().getId(), target.getId()))
            throw new ModerationException(INVALID_REPORT_TARGET);
        if (post != null && !Objects.equals(post.getUser().getId(), target.getId()))
            throw new ModerationException(INVALID_REPORT_TARGET);
        if (item != null) requireSameSchool(reporter, item.getSchool().getId());
        if (post != null) requireSameSchool(reporter, post.getSchool().getId());
    }

    private void requireSameSchool(User user, Long schoolId) {
        if (!Boolean.TRUE.equals(user.getSchoolVerified()) || user.getSchool() == null
                || !Objects.equals(user.getSchool().getId(), schoolId)) throw new ModerationException(FORBIDDEN);
    }
}
