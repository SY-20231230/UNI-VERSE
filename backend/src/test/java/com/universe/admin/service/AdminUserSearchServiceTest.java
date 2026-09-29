package com.universe.admin.service;

import com.universe.admin.dto.request.AdminUserSearchCondition;
import com.universe.admin.repository.AdminUserRepository;
import com.universe.report.service.ModerationAccessService;
import com.universe.report.service.ModerationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserSearchServiceTest {
    @Mock ModerationAccessService access;
    @Mock AdminUserRepository searchUsers;
    @InjectMocks AdminUserService service;
    @Test void checksAdminBeforeSearch() {
        var condition = new AdminUserSearchCondition(null, null, null);
        var pageable = PageRequest.of(0, 20);
        when(searchUsers.search(condition, pageable)).thenReturn(Page.empty(pageable));
        assertThat(service.search(42L, condition, pageable)).isEmpty();
        var order = inOrder(access, searchUsers);
        order.verify(access).requireAdmin(42L);
        order.verify(searchUsers).search(condition, pageable);
    }
    @Test void nonAdminCannotSearchUsers() {
        when(access.requireAdmin(42L)).thenThrow(new ModerationException(ModerationException.Code.FORBIDDEN));
        assertThatThrownBy(() -> service.search(42L, new AdminUserSearchCondition(null, null, null), PageRequest.of(0, 20)))
                .isInstanceOf(ModerationException.class);
        verifyNoInteractions(searchUsers);
    }
}
