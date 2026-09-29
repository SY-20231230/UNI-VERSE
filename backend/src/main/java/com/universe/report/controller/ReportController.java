package com.universe.report.controller;

import com.universe.global.common.ApiResponse;
import com.universe.global.common.PageResponse;
import com.universe.report.dto.request.ReportCreateRequest;
import com.universe.report.dto.response.ReportDetailResponse;
import com.universe.report.dto.response.ReportResponse;
import com.universe.report.entity.ReportStatus;
import com.universe.report.service.ReportCurrentUser;
import com.universe.report.service.ReportService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reports;
    private final ReportCurrentUser currentUser;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ReportResponse> create(Authentication authentication,
            @Valid @RequestBody ReportCreateRequest request) {
        return ApiResponse.success(reports.create(currentUser.requireId(authentication), request));
    }

    @GetMapping("/me")
    public ApiResponse<PageResponse<ReportResponse>> findMine(Authentication authentication,
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(new PageResponse<>(reports.findMine(currentUser.requireId(authentication), status,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")))));
    }

    @GetMapping("/{reportId}")
    public ApiResponse<ReportDetailResponse> getMine(Authentication authentication,
            @PathVariable @Positive Long reportId) {
        return ApiResponse.success(reports.getMine(currentUser.requireId(authentication), reportId));
    }
}
