package com.universe.admin.dto.response;
import com.universe.report.dto.response.ReportResponse;
import java.util.List;
/** Recent activities are bounded to 20 entries each; counts describe the complete histories. */
public record AdminUserDetailResponse(AdminUserResponse user, long tradeCount, long reportCount, long sanctionCount,
        List<AdminTradeSummaryResponse> recentTrades, List<ReportResponse> recentReports,
        List<UserSanctionResponse> recentSanctions) {
    public AdminUserDetailResponse {
        recentTrades = List.copyOf(recentTrades);
        recentReports = List.copyOf(recentReports);
        recentSanctions = List.copyOf(recentSanctions);
    }
}
