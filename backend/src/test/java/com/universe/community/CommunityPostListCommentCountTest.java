package com.universe.community;

import com.universe.community.entity.CommunityPost;
import com.universe.community.entity.PostCategory;
import com.universe.community.entity.PostStatus;
import com.universe.community.repository.CommentRepository;
import com.universe.community.repository.CommunityPostRepository;
import com.universe.community.repository.HashtagRepository;
import com.universe.community.repository.PostCommentCount;
import com.universe.community.repository.PostHashtagRepository;
import com.universe.community.repository.PostLikeRepository;
import com.universe.community.service.CommunityPostService;
import com.universe.school.entity.School;
import com.universe.school.repository.SchoolRepository;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommunityPostListCommentCountTest {
    @Mock CommunityPostRepository posts;
    @Mock UserRepository users;
    @Mock SchoolRepository schools;
    @Mock HashtagRepository hashtags;
    @Mock PostHashtagRepository postHashtags;
    @Mock PostLikeRepository likes;
    @Mock CommentRepository comments;

    CommunityPostService service;
    CommunityPost post;

    @BeforeEach
    void setUp() {
        School school = School.builder()
                .schoolName("서울대학교")
                .emailDomain("snu.ac.kr")
                .build();
        ReflectionTestUtils.setField(school, "id", 10L);
        User author = User.builder()
                .email("author@test.example")
                .password("password")
                .name("작성자")
                .nickname("작성자")
                .build();
        ReflectionTestUtils.setField(author, "id", 1L);
        author.verifySchool(school);
        post = CommunityPost.builder()
                .user(author)
                .school(school)
                .category(PostCategory.FREE)
                .title("댓글 수가 표시되는 게시글")
                .content("내용")
                .isAnonymous(false)
                .build();
        ReflectionTestUtils.setField(post, "id", 20L);

        service = new CommunityPostService(
                posts, users, schools, hashtags, postHashtags, likes, comments);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of()));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void listIncludesActiveCommentCountFromSingleBatchQuery() {
        when(users.findById(1L)).thenReturn(Optional.of(post.getUser()));
        when(posts.search(any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(post)));
        when(comments.countByPostIdsAndStatus(List.of(20L), PostStatus.ACTIVE))
                .thenReturn(List.of(new PostCommentCount(20L, 3L)));
        when(likes.countByPostId(20L)).thenReturn(1L);
        when(postHashtags.findByPostId(20L)).thenReturn(List.of());

        var response = service.list(null, null, null, "latest", 0, 20);

        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().getFirst().getCommentCount()).isEqualTo(3L);
        verify(comments).countByPostIdsAndStatus(List.of(20L), PostStatus.ACTIVE);
    }
}
