package com.universe.admin.repository;

import com.universe.admin.dto.request.AdminReportSearchCondition;
import com.universe.admin.dto.response.AdminReportListResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AdminReportRepositoryCustom {
    Page<AdminReportListResponse> search(AdminReportSearchCondition condition, Pageable pageable);
}
