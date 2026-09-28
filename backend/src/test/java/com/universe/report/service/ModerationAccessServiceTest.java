package com.universe.report.service;

import com.universe.report.repository.ModerationUserRepository;
import com.universe.user.entity.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ModerationAccessServiceTest {
    @Mock ModerationUserRepository users;
    @InjectMocks ModerationAccessService service;

    private User user(long id, UserRole role, AccountStatus status) {
        User user = User.builder().email(id + "@test.example").password("test")
                .name("name").nickname("nick").build();
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "role", role);
        user.updateAccountStatus(status);
        return user;
    }

    @Test void missingIdentityIsRejectedBeforeDatabaseAccess() {
        assertThatThrownBy(() -> service.requireActiveUser(null))
                .isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode())
                .isEqualTo(ModerationException.Code.FORBIDDEN);
        verifyNoInteractions(users);
    }

    @Test void unknownUserIsRejected() {
        when(users.findById(42L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.requireActiveUser(42L))
                .isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode())
                .isEqualTo(ModerationException.Code.USER_NOT_FOUND);
    }

    @Test void inactiveAccountsCannotUseMemberFeatures() {
        for (AccountStatus status : new AccountStatus[]{AccountStatus.SUSPENDED, AccountStatus.BANNED, AccountStatus.DELETED}) {
            when(users.findById(42L)).thenReturn(Optional.of(user(42L, UserRole.USER, status)));
            assertThatThrownBy(() -> service.requireActiveUser(42L))
                    .isInstanceOf(ModerationException.class)
                    .extracting(error -> ((ModerationException) error).getCode())
                    .isEqualTo(ModerationException.Code.FORBIDDEN);
        }
    }

    @Test void activeUserIsReturnedButCannotPassAdminCheck() {
        User member = user(42L, UserRole.USER, AccountStatus.ACTIVE);
        when(users.findById(42L)).thenReturn(Optional.of(member));
        assertThat(service.requireActiveUser(42L)).isSameAs(member);
        assertThatThrownBy(() -> service.requireAdmin(42L))
                .isInstanceOf(ModerationException.class)
                .extracting(error -> ((ModerationException) error).getCode())
                .isEqualTo(ModerationException.Code.FORBIDDEN);
    }

    @Test void onlyActiveAdministratorPassesAdminCheck() {
        User admin = user(7L, UserRole.ADMIN, AccountStatus.ACTIVE);
        when(users.findById(7L)).thenReturn(Optional.of(admin));
        assertThat(service.requireAdmin(7L)).isSameAs(admin);
    }
}
