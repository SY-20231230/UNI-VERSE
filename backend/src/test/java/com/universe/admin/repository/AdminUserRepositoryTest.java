package com.universe.admin.repository;

import com.universe.admin.dto.request.AdminUserSearchCondition;
import com.universe.school.entity.School;
import com.universe.user.entity.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.*;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.sql.init.mode=never", "spring.jpa.show-sql=false"})
class AdminUserRepositoryTest {
    @Autowired EntityManager em;
    @Autowired AdminUserRepository users;
    User alice, bob, unverified;
    School school;
    @BeforeEach void setup() {
        school = School.builder().schoolName("School").emailDomain("school.example").build();
        em.persist(school);
        alice = user("Alice", "alice@test.example", "alpha");
        alice.verifySchool(school);
        bob = user("Bob", "bob@test.example", "beta");
        bob.verifySchool(school);
        bob.updateAccountStatus(AccountStatus.SUSPENDED);
        unverified = user("NoSchool", "none@test.example", "literal%_nick");
        em.flush(); em.clear();
    }
    User user(String name, String email, String nick) {
        var user = User.builder().name(name).email(email).nickname(nick).password("test").build();
        em.persist(user); return user;
    }
    Page<com.universe.admin.dto.response.AdminUserListResponse> search(String word, AccountStatus status, Long schoolId, int page, int size) {
        return users.search(new AdminUserSearchCondition(word, status, schoolId), PageRequest.of(page, size));
    }
    @Test void retainsUnverifiedMembersWithNullSchool() {
        var page = search(null, null, null, 0, 20);
        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getContent()).anySatisfy(row -> {
            assertThat(row.userId()).isEqualTo(unverified.getId());
            assertThat(row.schoolId()).isNull();
            assertThat(row.schoolVerified()).isFalse();
        });
    }
    @Test void combinesKeywordStatusAndSchool() {
        assertThat(search(" ALICE ", AccountStatus.ACTIVE, school.getId(), 0, 20).getContent())
                .extracting(row -> row.userId()).containsExactly(alice.getId());
        assertThat(search("alice", AccountStatus.SUSPENDED, school.getId(), 0, 20)).isEmpty();
    }
    @Test void keywordMatchesEmailNameAndNicknameWithoutWildcardExpansion() {
        assertThat(search("BOB@", null, null, 0, 20).getContent()).extracting(row -> row.userId()).containsExactly(bob.getId());
        assertThat(search("alpha", null, null, 0, 20).getContent()).extracting(row -> row.userId()).containsExactly(alice.getId());
        assertThat(search("%_", null, null, 0, 20).getContent()).extracting(row -> row.userId()).containsExactly(unverified.getId());
    }
    @Test void pagingHasStableOrderAndTotalBeyondLastPage() {
        em.createQuery("update User u set u.createdAt = :time")
                .setParameter("time", java.time.LocalDateTime.of(2026, 9, 23, 0, 0)).executeUpdate();
        assertThat(search(null, null, null, 1, 1).getContent()).extracting(row -> row.userId()).containsExactly(bob.getId());
        var beyond = search(null, null, null, 10, 1);
        assertThat(beyond.getContent()).isEmpty();
        assertThat(beyond.getTotalElements()).isEqualTo(3);
    }
}
