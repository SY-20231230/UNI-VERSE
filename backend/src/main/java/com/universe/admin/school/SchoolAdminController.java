package com.universe.admin.school;

import com.universe.admin.school.dto.SchoolAdminDashboardResponse;
import com.universe.global.common.ApiResponse;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.global.security.CurrentUser;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/school")
@RequiredArgsConstructor
public class SchoolAdminController {

    private final SchoolAdminService schoolAdminService;
    private final UserRepository userRepository;

    @GetMapping("/dashboard")
    public ApiResponse<SchoolAdminDashboardResponse> getDashboard() {
        try {
            User user = userRepository.findById(CurrentUser.id())
                    .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));

            if (user.getSchool() == null) {
                throw new BusinessException(ErrorCode.FORBIDDEN); // Or any generic forbidden error
            }

            return ApiResponse.success(schoolAdminService.getDashboardStats(user.getSchool().getId()));
        } catch (Exception e) {
            try {
                java.io.PrintWriter pw = new java.io.PrintWriter("error.log");
                e.printStackTrace(pw);
                pw.close();
            } catch(Exception ex) {}
            throw e;
        }
    }
}
