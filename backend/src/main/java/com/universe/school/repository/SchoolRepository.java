package com.universe.school.repository;

import com.universe.school.entity.School;
import com.universe.school.entity.SchoolStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SchoolRepository extends JpaRepository<School, Long> {
    List<School> findByStatusAndSchoolNameContainingIgnoreCaseOrderBySchoolNameAsc(SchoolStatus status, String keyword);
    List<School> findByStatusOrderBySchoolNameAsc(SchoolStatus status);
    Optional<School> findByEmailDomainIgnoreCase(String emailDomain);
}
