package com.universe.admin.repository;

import com.universe.admin.dto.request.AdminUserSearchCondition;
import com.universe.admin.dto.response.AdminUserListResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AdminUserRepositoryCustom {
    Page<AdminUserListResponse> search(AdminUserSearchCondition condition, Pageable pageable);
}
