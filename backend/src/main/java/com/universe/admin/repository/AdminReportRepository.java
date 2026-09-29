package com.universe.admin.repository;

import com.universe.report.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminReportRepository extends JpaRepository<Report, Long>, AdminReportRepositoryCustom { }
