package com.universe.admin.controller;

import com.universe.admin.service.AdminSessionActivityService;
import com.universe.report.service.ReportCurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/admin/session-activities")
@RequiredArgsConstructor
public class AdminSessionActivityController {
    private final AdminSessionActivityService activities;
    private final ReportCurrentUser currentUser;

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(Authentication authentication) {
        byte[] csv = activities.exportCsv(currentUser.requireId(authentication), LocalDateTime.now());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"session-activity.csv\"")
                .body(csv);
    }
}