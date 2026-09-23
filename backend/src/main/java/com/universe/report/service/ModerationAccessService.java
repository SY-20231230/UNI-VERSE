package com.universe.report.service;

import com.universe.report.repository.ModerationUserRepository;
import com.universe.user.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.universe.report.service.ModerationException.Code.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ModerationAccessService {
    private final ModerationUserRepository users;

    public User requireActiveUser(Long authenticatedUserId) {
        if (authenticatedUserId == null) throw new ModerationException(FORBIDDEN);
        User user = users.findById(authenticatedUserId).orElseThrow(() -> new ModerationException(USER_NOT_FOUND));
        if (user.getAccountStatus() != AccountStatus.ACTIVE) throw new ModerationException(FORBIDDEN);
        return user;
    }

    public User requireAdmin(Long authenticatedUserId) {
        User user = requireActiveUser(authenticatedUserId);
        if (user.getRole() != UserRole.ADMIN) throw new ModerationException(FORBIDDEN);
        return user;
    }
}
