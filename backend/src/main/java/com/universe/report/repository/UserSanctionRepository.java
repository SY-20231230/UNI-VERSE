package com.universe.report.repository;

import com.universe.report.entity.*;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface UserSanctionRepository extends JpaRepository<UserSanction, Long> {
    Page<UserSanction> findByUserId(Long userId, Pageable pageable);
    Optional<UserSanction> findFirstByUserIdAndSanctionTypeOrderByStartAtDescIdDesc(Long userId, SanctionType type);

    @Query("""
        select count(s) > 0 from UserSanction s where s.user.id = :userId
        and s.sanctionType = :type and s.startAt <= :now and (s.endAt is null or s.endAt > :now)
        """)
    boolean hasActive(@Param("userId") Long userId, @Param("type") SanctionType type, @Param("now") LocalDateTime now);

    @Query("""
        select distinct s.user.id from UserSanction s
        where s.sanctionType = com.universe.report.entity.SanctionType.SUSPENSION
        and s.user.accountStatus = com.universe.user.entity.AccountStatus.SUSPENDED
        and s.endAt is not null and s.endAt <= :now
        and not exists (select a.id from UserSanction a where a.user.id = s.user.id
            and a.sanctionType in (com.universe.report.entity.SanctionType.SUSPENSION,
                                  com.universe.report.entity.SanctionType.BAN)
            and a.startAt <= :now and (a.endAt is null or a.endAt > :now))
        order by s.user.id
        """)
    org.springframework.data.domain.Slice<Long> findExpiredUserIds(@Param("now") LocalDateTime now, Pageable pageable);
}
