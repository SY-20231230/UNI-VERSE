package com.universe.school.repository;

import com.universe.school.entity.SchoolVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SchoolVerificationRepository extends JpaRepository<SchoolVerification, Long> {
    Optional<SchoolVerification> findTopByUserIdOrderByCreatedAtDesc(Long userId);
}
