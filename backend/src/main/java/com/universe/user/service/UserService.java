package com.universe.user.service; import com.universe.global.exception.*; import com.universe.global.security.CurrentUser; import com.universe.user.dto.request.UpdateUserRequest; import com.universe.user.dto.response.UserResponse; import com.universe.user.repository.UserRepository; import lombok.RequiredArgsConstructor; import org.springframework.security.crypto.password.PasswordEncoder; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final com.universe.user.repository.MyPageTradeRepository trades;
    private final com.universe.report.repository.ReportRepository reports;

    @Transactional(readOnly = true)
    public com.universe.user.dto.response.UserProfileResponse getProfile(Long userId) {
        com.universe.user.entity.User u = users.findById(userId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return com.universe.user.dto.response.UserProfileResponse.from(u, trades.countCompleted(userId), reports.countByTargetUserId(userId));
    }

    @Transactional(readOnly = true)
    public UserResponse me() {
        return UserResponse.from(user());
    }

    @Transactional
    public UserResponse update(UpdateUserRequest r) {
        var u = user();
        if (r.getNickname() != null) u.updateNickname(r.getNickname());
        if (r.getPassword() != null) u.changePassword(encoder.encode(r.getPassword()));
        if (r.getDepartment() != null) u.updateDepartment(r.getDepartment());
        return UserResponse.from(u);
    }

    @Transactional
    public void delete() {
        user().updateAccountStatus(com.universe.user.entity.AccountStatus.DELETED);
    }

    private com.universe.user.entity.User user() {
        return users.findById(CurrentUser.id()).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }
}
