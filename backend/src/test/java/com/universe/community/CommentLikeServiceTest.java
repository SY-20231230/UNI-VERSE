package com.universe.community;

import com.universe.community.entity.*;
import com.universe.community.repository.*;
import com.universe.community.service.CommentLikeService;
import com.universe.school.entity.School;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommentLikeServiceTest {
    @Mock CommentLikeRepository likes;
    @Mock CommentRepository comments;
    @Mock UserRepository users;

    CommentLikeService service;
    User user;
    Comment comment;

    @BeforeEach
    void setUp() {
        School school = School.builder().schoolName("테스트대학교").emailDomain("test.ac.kr").build();
        ReflectionTestUtils.setField(school, "id", 10L);
        user = User.builder().email("user@test.ac.kr").password("secret")
                .name("사용자").nickname("닉네임").build();
        ReflectionTestUtils.setField(user, "id", 1L);
        user.verifySchool(school);
        CommunityPost post = CommunityPost.builder().user(user).school(school).category(PostCategory.FREE)
                .title("제목").content("내용").isAnonymous(false).build();
        ReflectionTestUtils.setField(post, "id", 20L);
        comment = Comment.builder().post(post).user(user).content("댓글").isAnonymous(false).build();
        ReflectionTestUtils.setField(comment, "id", 30L);
        service = new CommentLikeService(likes, comments, users);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of()));
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void likesCommentAndReturnsUpdatedCount() {
        when(comments.findByIdAndStatus(30L, PostStatus.ACTIVE)).thenReturn(Optional.of(comment));
        when(users.findById(1L)).thenReturn(Optional.of(user));
        when(likes.existsByCommentIdAndUserId(30L, 1L)).thenReturn(false);
        when(likes.countByCommentId(30L)).thenReturn(1L);

        var response = service.like(30L);

        assertThat(response.liked()).isTrue();
        assertThat(response.likeCount()).isEqualTo(1L);
        verify(likes).save(any(CommentLike.class));
    }

    @Test
    void repeatedLikeIsIdempotent() {
        when(comments.findByIdAndStatus(30L, PostStatus.ACTIVE)).thenReturn(Optional.of(comment));
        when(users.findById(1L)).thenReturn(Optional.of(user));
        when(likes.existsByCommentIdAndUserId(30L, 1L)).thenReturn(true);
        when(likes.countByCommentId(30L)).thenReturn(1L);

        service.like(30L);

        verify(likes, never()).save(any());
    }
}
