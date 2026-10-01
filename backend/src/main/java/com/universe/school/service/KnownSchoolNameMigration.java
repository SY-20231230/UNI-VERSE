package com.universe.school.service;

import com.universe.school.KnownSchools;
import com.universe.school.entity.School;
import com.universe.school.repository.SchoolRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class KnownSchoolNameMigration implements ApplicationRunner {
    private final SchoolRepository schools;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<School> records = schools.findAll();
        for (School school : records) {
            String domain = school.getEmailDomain();
            if (domain == null || !school.getSchoolName().equalsIgnoreCase(domain)) continue;
            KnownSchools.nameOf(domain).ifPresent(school::rename);
        }
    }
}