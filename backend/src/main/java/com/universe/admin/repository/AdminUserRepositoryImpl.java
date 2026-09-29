package com.universe.admin.repository;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.PathBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.universe.admin.dto.request.AdminUserSearchCondition;
import com.universe.admin.dto.response.AdminUserListResponse;
import com.universe.school.entity.School;
import com.universe.user.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;
import org.springframework.data.domain.*;

public class AdminUserRepositoryImpl implements AdminUserRepositoryCustom {
    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Page<AdminUserListResponse> search(AdminUserSearchCondition condition, Pageable pageable) {
        var user = new PathBuilder<>(User.class, "user");
        var id = user.getNumber("id", Long.class);
        var email = user.getString("email");
        var name = user.getString("name");
        var nickname = user.getString("nickname");
        var schoolId = user.get("school", School.class).getNumber("id", Long.class);
        var status = user.getEnum("accountStatus", AccountStatus.class);
        var createdAt = user.getDateTime("createdAt", LocalDateTime.class);
        var where = new BooleanBuilder();
        if (condition.keyword() != null && !condition.keyword().isBlank()) {
            String keyword = condition.keyword().strip();
            where.and(email.containsIgnoreCase(keyword).or(name.containsIgnoreCase(keyword))
                    .or(nickname.containsIgnoreCase(keyword)));
        }
        if (condition.accountStatus() != null) where.and(status.eq(condition.accountStatus()));
        if (condition.schoolId() != null) where.and(schoolId.eq(condition.schoolId()));

        var query = new JPAQueryFactory(entityManager);
        var rows = query.select(Projections.constructor(AdminUserListResponse.class,
                        id, email, name, nickname, schoolId, user.getBoolean("schoolVerified"),
                        user.getEnum("role", UserRole.class), status, user.getNumber("trustScore", Integer.class)))
                .from(user).where(where).orderBy(createdAt.desc(), id.desc())
                .offset(pageable.getOffset()).limit(pageable.getPageSize()).fetch();
        Long total = query.select(id.count()).from(user).where(where).fetchOne();
        return new PageImpl<>(rows, pageable, total == null ? 0 : total);
    }
}
