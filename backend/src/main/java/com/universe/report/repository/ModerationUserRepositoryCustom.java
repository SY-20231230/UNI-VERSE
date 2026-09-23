package com.universe.report.repository;
import com.universe.user.entity.User;
import java.util.Optional;
public interface ModerationUserRepositoryCustom {
    Optional<User> findLockedById(Long id);
}
