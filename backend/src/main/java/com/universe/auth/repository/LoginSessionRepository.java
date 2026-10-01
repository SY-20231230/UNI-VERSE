package com.universe.auth.repository;

import com.universe.auth.entity.LoginSession;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoginSessionRepository extends JpaRepository<LoginSession, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from LoginSession session where session.id = :sessionId")
    Optional<LoginSession> findLockedById(@Param("sessionId") String sessionId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from LoginSession session where session.endedAt is null and session.lastActivityAt <= :cutoff")
    List<LoginSession> findInactiveSessions(@Param("cutoff") LocalDateTime cutoff);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select session from LoginSession session where session.user.id = :userId and session.endedAt is null")
    List<LoginSession> findOpenSessionsByUserId(@Param("userId") Long userId);

    List<LoginSession> findAllByOrderByLoginAtDescIdDesc();
}