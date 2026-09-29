package com.universe.report.repository;

import com.universe.report.entity.ReportEvidence;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReportEvidenceRepository extends JpaRepository<ReportEvidence, Long> {
    List<ReportEvidence> findByReportIdOrderByIdAsc(Long reportId);
}
