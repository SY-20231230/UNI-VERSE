package com.universe.report.repository;

import com.universe.report.entity.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Long> {
    Page<Report> findByReporterId(Long reporterId, Pageable pageable);
    Page<Report> findByReporterIdAndStatus(Long reporterId, ReportStatus status, Pageable pageable);
    Page<Report> findByTargetUserId(Long targetUserId, Pageable pageable);
    long countByTargetUserId(Long targetUserId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Report r where r.id = :id")
    Optional<Report> findLockedById(@Param("id") Long id);
}
