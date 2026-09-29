package com.universe.community;

import com.universe.community.dto.response.CommentResponse;
import com.universe.community.entity.Comment;
import com.universe.community.entity.CommunityPost;
import com.universe.community.entity.PostCategory;
import com.universe.community.entity.PostStatus;
import com.universe.community.repository.CommunityPostRepository;
import com.universe.community.repository.PostLikeRepository;
import com.universe.community.service.PostLikeService;
import com.universe.notification.event.PostLikedEvent;
import com.universe.school.entity.School;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommunityInteractionTest {
    @Mock PostLikeRepository likes;
    @Mock CommunityPostRepository posts;
    @Mock UserRepository users;
    @Mock ApplicationEventPublisher events;

    PostLikeService service;
    User author;
    CommunityPost post;

    @BeforeEach
    void setUp() {
        School school = School.builder().schoolName("서울대학교").emailDomain("snu.ac.kr").build();
        ReflectionTestUtils.setField(school, "id", 10L);
        author = User.builder().email("author@test.example").password("secret")
                .name("작성자").nickname("작성자닉네임").build();
        ReflectionTestUtils.setField(author, "id", 1L);
        author.verifySchool(school);
        post = CommunityPost.builder().user(author).school(school).category(PostCategory.FREE)
                .title("제목").content("내용").isAnonymous(true).build();
        ReflectionTestUtils.setField(post, "id", 20L);
        service = new PostLikeService(likes, posts, users, events);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of()));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void repeatedLikeReturnsCurrentStateWithoutFailure() {
        when(posts.findByIdAndStatus(20L, PostStatus.ACTIVE)).thenReturn(Optional.of(post));
        when(users.findById(1L)).thenReturn(Optional.of(author));
        when(likes.existsByPostIdAndUserId(20L, 1L)).thenReturn(true);
        when(likes.countByPostId(20L)).thenReturn(3L);

        var response = service.like(20L);

        assertThat(response.isLiked()).isTrue();
        assertThat(response.getLikeCount()).isEqualTo(3L);
        verify(likes, never()).save(any());
        verify(events, never()).publishEvent(any(PostLikedEvent.class));
    }

    @Test
    void repeatedUnlikeReturnsCurrentStateWithoutFailure() {
        when(users.findById(1L)).thenReturn(Optional.of(author));
        when(likes.findByPostIdAndUserId(20L, 1L)).thenReturn(Optional.empty());
        when(likes.countByPostId(20L)).thenReturn(2L);

        var response = service.unlike(20L);

        assertThat(response.isLiked()).isFalse();
        assertThat(response.getLikeCount()).isEqualTo(2L);
    }

    @Test
    void anonymousCommentStillIdentifiesPostAuthorWithoutExposingIdentity() {
        Comment comment = Comment.builder().post(post).user(author).content("작성자 댓글")
                .isAnonymous(true).build();
        ReflectionTestUtils.setField(comment, "id", 30L);

        CommentResponse response = CommentResponse.from(comment);

        assertThat(response.isAnonymous()).isTrue();
        assertThat(response.isPostAuthor()).isTrue();
        assertThat(response.getAuthorId()).isNull();
        assertThat(response.getAuthorName()).isEqualTo("익명");
    }

    @Test
    void otherUsersCommentIsNotMarkedAsPostAuthor() {
        User otherUser = User.builder().email("other@test.example").password("secret")
                .name("다른 사용자").nickname("다른닉네임").build();
        ReflectionTestUtils.setField(otherUser, "id", 2L);
        Comment comment = Comment.builder().post(post).user(otherUser).content("일반 댓글")
                .isAnonymous(false).build();

        CommentResponse response = CommentResponse.from(comment);

        assertThat(response.isPostAuthor()).isFalse();
        assertThat(response.getAuthorName()).isEqualTo("다른닉네임");
    }

    @Test
    void anonymousCommentIsMarkedMineOnlyForItsWriter() {
        Comment comment = Comment.builder().post(post).user(author).content("익명 댓글")
                .isAnonymous(true).build();
        ReflectionTestUtils.setField(comment, "id", 31L);

        assertThat(CommentResponse.from(comment, author.getId()).isMine()).isTrue();
        assertThat(CommentResponse.from(comment, author.getId() + 100).isMine()).isFalse();
        assertThat(CommentResponse.from(comment).isMine()).isFalse();
        assertThat(CommentResponse.from(comment, author.getId()).getAuthorId()).isNull();
    }
}
