package com.universe.user.entity;

import com.universe.school.entity.School;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserDisplayUniversityNameTest {

    @Test
    void enteredUniversityNameTakesPrecedenceOverDomainMapping() {
        User user = User.builder().email("member@multiverse.ac.kr").password("encoded")
                .name("Member").nickname("Member").universityName("회원 입력 대학").build();
        user.verifySchool(School.builder().schoolName("multiverse.ac.kr").emailDomain("multiverse.ac.kr").build());

        assertThat(user.getDisplayUniversityName()).isEqualTo("회원 입력 대학");
    }

    @Test
    void existingMembersWithDomainAsSchoolNameUseKnownSchoolDisplayName() {
        User user = User.builder().email("member@multiverse.ac.kr").password("encoded")
                .name("Member").nickname("Member").build();
        user.verifySchool(School.builder().schoolName("multiverse.ac.kr").emailDomain("multiverse.ac.kr").build());

        assertThat(user.getDisplayUniversityName()).isEqualTo("연세 대학교");
    }
}