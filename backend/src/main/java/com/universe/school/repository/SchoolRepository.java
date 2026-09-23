package com.universe.school.repository;

import com.universe.school.entity.School;
import com.universe.school.entity.SchoolStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SchoolRepository extends JpaRepository<School, Long> {
    List<School> findByStatusAndSchoolNameContainingIgnoreCaseOrderBySchoolNameAsc(SchoolStatus status, String keyword);
    List<School> findByStatusOrderBySchoolNameAsc(SchoolStatus status);
}
