package com.universe.community;

import com.universe.community.entity.*;
import com.universe.community.repository.CommunityPostRepository;
import com.universe.school.entity.School;
import com.universe.user.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never",
        "spring.jpa.show-sql=false"
})
class CommunityNoticeRepositoryTest {
    @Autowired EntityManager entityManager;
    @Autowired CommunityPostRepository posts;

    @Test
    void noticeIsPinnedBeforeRegularPost() {
        School school = School.builder().schoolName("공지대학교").emailDomain("notice.ac.kr").build();
        entityManager.persist(school);
        User author = User.builder().email("admin@notice.ac.kr").password("secret")
                .name("관리자").nickname("학교관리자").build();
        author.verifySchool(school);
        entityManager.persist(author);
        entityManager.persist(post(author, school, PostCategory.FREE, "일반 글"));
        entityManager.persist(post(author, school, PostCategory.NOTICE, "중요 공지"));
        entityManager.flush();

        var page = posts.search(school.getId(), null, null, null, "latest", PageRequest.of(0, 10));

        assertThat(page.getContent()).extracting(CommunityPost::getCategory)
                .containsExactly(PostCategory.NOTICE, PostCategory.FREE);
    }

    private CommunityPost post(User user, School school, PostCategory category, String title) {
        return CommunityPost.builder().user(user).school(school).category(category)
                .title(title).content("내용").isAnonymous(false).build();
    }
}
