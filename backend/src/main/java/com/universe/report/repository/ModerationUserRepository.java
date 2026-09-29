package com.universe.report.repository;

import com.universe.user.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

/** Access needed by moderation; does not implement signup or profile mutations. */
public interface ModerationUserRepository extends Repository<User, Long>, ModerationUserRepositoryCustom {
    @EntityGraph(attributePaths = "school")
    Optional<User> findById(Long id);

}


