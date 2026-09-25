package com.universe.admin.controller;

import com.universe.admin.dto.request.*;
import com.universe.admin.dto.response.*;
import com.universe.admin.service.AdminReportService;
import com.universe.global.common.ApiResponse;
import com.universe.global.common.PageResponse;
import com.universe.report.dto.response.ReportResponse;
import com.universe.report.service.ReportCurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {
    private final AdminReportService reports;
    private final ReportCurrentUser currentUser;

    @GetMapping
    public ApiResponse<PageResponse<AdminReportListResponse>> search(Authentication authentication,
            @Valid @ModelAttribute AdminReportSearchCondition condition,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "createdAt,desc") @Pattern(regexp = "createdAt,(asc|desc)") String sort) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.fromString(sort.split(",")[1]), "createdAt"));
        return ApiResponse.success(new PageResponse<>(reports.search(currentUser.requireId(authentication), condition, pageable)));
    }

    @GetMapping("/{reportId}")
    public ApiResponse<AdminReportDetailResponse> getDetail(Authentication authentication,
            @PathVariable @Positive Long reportId) {
        return ApiResponse.success(reports.getDetail(currentUser.requireId(authentication), reportId));
    }

    @PostMapping("/{reportId}/approve")
    public ApiResponse<ReportProcessResponse> approve(Authentication authentication,
            @PathVariable @Positive Long reportId, @Valid @RequestBody ReportApproveRequest request) {
        return ApiResponse.success(reports.approve(currentUser.requireId(authentication), reportId, request));
    }

    @PostMapping("/{reportId}/dismiss")
    public ApiResponse<ReportResponse> dismiss(Authentication authentication,
            @PathVariable @Positive Long reportId, @Valid @RequestBody ReportDismissRequest request) {
        return ApiResponse.success(reports.dismiss(currentUser.requireId(authentication), reportId, request));
    }
}
