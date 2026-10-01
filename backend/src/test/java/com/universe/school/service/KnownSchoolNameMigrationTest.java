package com.universe.school.service;

import com.universe.school.entity.School;
import com.universe.school.repository.SchoolRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KnownSchoolNameMigrationTest {
    @Mock SchoolRepository schools;

    @Test
    void replacesLegacyDomainNamesWithKnownSchoolNames() throws Exception {
        School legacyKnownSchool = School.builder()
                .schoolName("multiverse.ac.kr").emailDomain("multiverse.ac.kr").build();
        School customSchool = School.builder()
                .schoolName("사용자 지정 학교").emailDomain("custom.example").build();
        School unknownSchool = School.builder()
                .schoolName("unknown.example").emailDomain("unknown.example").build();
        when(schools.findAll()).thenReturn(List.of(legacyKnownSchool, customSchool, unknownSchool));

        new KnownSchoolNameMigration(schools).run(null);

        assertThat(legacyKnownSchool.getSchoolName()).isEqualTo("연세 대학교");
        assertThat(customSchool.getSchoolName()).isEqualTo("사용자 지정 학교");
        assertThat(unknownSchool.getSchoolName()).isEqualTo("unknown.example");
    }
}