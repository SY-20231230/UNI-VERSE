package com.universe.admin.repository;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.PathBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.universe.admin.dto.request.AdminReportSearchCondition;
import com.universe.admin.dto.response.AdminReportListResponse;
import com.universe.report.entity.*;
import com.universe.user.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;
import org.springframework.data.domain.*;

public class AdminReportRepositoryImpl implements AdminReportRepositoryCustom {
    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Page<AdminReportListResponse> search(AdminReportSearchCondition condition, Pageable pageable) {
        // Typed paths keep this domain independent of the team's generated-Q source configuration.
        var report = new PathBuilder<>(Report.class, "report");
        var id = report.getNumber("id", Long.class);
        var reporterId = report.get("reporter", User.class).getNumber("id", Long.class);
        var targetId = report.get("targetUser", User.class).getNumber("id", Long.class);
        var type = report.getEnum("reportType", ReportType.class);
        var status = report.getEnum("status", ReportStatus.class);
        var createdAt = report.getDateTime("createdAt", LocalDateTime.class);
        var processedAt = report.getDateTime("processedAt", LocalDateTime.class);
        var where = new BooleanBuilder();
        if (condition.status() != null) where.and(status.eq(condition.status()));
        if (condition.reportType() != null) where.and(type.eq(condition.reportType()));
        if (condition.targetUserId() != null) where.and(targetId.eq(condition.targetUserId()));
        if (condition.from() != null) where.and(createdAt.goe(condition.from()));
        if (condition.to() != null) where.and(createdAt.loe(condition.to()));

        var query = new JPAQueryFactory(entityManager);
        var order = pageable.getSort().getOrderFor("createdAt");
        boolean ascending = order != null && order.isAscending();
        var rows = query.select(Projections.constructor(AdminReportListResponse.class,
                        id, reporterId, targetId, type, status, createdAt, processedAt))
                .from(report).where(where)
                .orderBy(ascending ? createdAt.asc() : createdAt.desc(), ascending ? id.asc() : id.desc())
                .offset(pageable.getOffset()).limit(pageable.getPageSize()).fetch();
        Long total = query.select(id.count()).from(report).where(where).fetchOne();
        return new PageImpl<>(rows, pageable, total == null ? 0 : total);
    }
}
