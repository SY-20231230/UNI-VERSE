package com.universe.admin.service;

import com.universe.admin.dto.request.AdminReportSearchCondition;
import com.universe.admin.repository.AdminReportRepository;
import com.universe.report.service.ModerationAccessService;
import com.universe.report.service.ModerationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class AdminReportSearchServiceTest {
    @Mock ModerationAccessService access;
    @Mock AdminReportRepository searchReports;
    @InjectMocks AdminReportService service;
    final AdminReportSearchCondition condition = new AdminReportSearchCondition(null, null, null, null, null);
    final Pageable pageable = PageRequest.of(0, 20);

    @Test void requiresAdminBeforeReadingAnyReports() {
        when(access.requireAdmin(42L)).thenThrow(new ModerationException(ModerationException.Code.FORBIDDEN));
        assertThatThrownBy(() -> service.search(42L, condition, pageable)).isInstanceOf(ModerationException.class);
        verifyNoInteractions(searchReports);
    }
    @Test void delegatesAuthorizedSearchWithoutChangingFilters() {
        when(searchReports.search(condition, pageable)).thenReturn(Page.empty(pageable));
        assertThat(service.search(42L, condition, pageable)).isEmpty();
        var order = inOrder(access, searchReports);
        order.verify(access).requireAdmin(42L); order.verify(searchReports).search(condition, pageable);
    }
}
