package com.universe.community.repository;

import com.universe.community.entity.Comment;
import com.universe.community.entity.CommunityPost;
import com.universe.community.entity.PostCategory;
import com.universe.community.entity.PostStatus;
import com.universe.school.entity.School;
import com.universe.user.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never",
        "spring.jpa.show-sql=false"
})
class CommentRepositoryTest {
    @Autowired
    EntityManager entityManager;

    @Autowired
    CommentRepository comments;

    @Test
    void countsOnlyActiveCommentsForEachPost() {
        School school = School.builder()
                .schoolName("댓글 집계 대학교")
                .emailDomain("comment-count.example")
                .build();
        entityManager.persist(school);

        User author = User.builder()
                .email("comment-count@test.example")
                .password("password")
                .name("작성자")
                .nickname("작성자")
                .build();
        author.verifySchool(school);
        entityManager.persist(author);

        CommunityPost first = post(author, school, "첫 번째 게시글");
        CommunityPost second = post(author, school, "두 번째 게시글");
        entityManager.persist(first);
        entityManager.persist(second);

        entityManager.persist(comment(first, author, "첫 댓글"));
        entityManager.persist(comment(first, author, "두 번째 댓글"));
        Comment deleted = comment(first, author, "삭제 댓글");
        deleted.deleteComment();
        entityManager.persist(deleted);
        entityManager.persist(comment(second, author, "다른 글 댓글"));
        entityManager.flush();

        List<PostCommentCount> counts = comments.countByPostIdsAndStatus(
                List.of(first.getId(), second.getId()), PostStatus.ACTIVE);

        assertThat(counts).containsExactlyInAnyOrder(
                new PostCommentCount(first.getId(), 2L),
                new PostCommentCount(second.getId(), 1L));
    }

    private CommunityPost post(User author, School school, String title) {
        return CommunityPost.builder()
                .user(author)
                .school(school)
                .category(PostCategory.FREE)
                .title(title)
                .content("내용")
                .isAnonymous(false)
                .build();
    }

    private Comment comment(CommunityPost post, User author, String content) {
        return Comment.builder()
                .post(post)
                .user(author)
                .content(content)
                .isAnonymous(false)
                .build();
    }
}
