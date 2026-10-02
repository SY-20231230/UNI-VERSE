package com.universe.community;

import com.universe.community.dto.request.CommentCreateRequest;
import com.universe.community.entity.*;
import com.universe.community.repository.*;
import com.universe.community.service.CommentService;
import com.universe.notification.event.CommentCreatedEvent;
import com.universe.school.entity.School;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import org.junit.jupiter.api.*;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommentReplyServiceTest {
    @Mock CommentRepository comments;
    @Mock CommunityPostRepository posts;
    @Mock UserRepository users;
    @Mock CommentLikeRepository likes;
    @Mock ApplicationEventPublisher events;

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createsReplyLinkedToTopLevelComment() {
        School school = School.builder().schoolName("답글대학교").emailDomain("reply.ac.kr").build();
        ReflectionTestUtils.setField(school, "id", 10L);
        User user = User.builder().email("user@reply.ac.kr").password("secret")
                .name("사용자").nickname("닉네임").build();
        ReflectionTestUtils.setField(user, "id", 1L);
        user.verifySchool(school);
        CommunityPost post = CommunityPost.builder().user(user).school(school).category(PostCategory.FREE)
                .title("제목").content("내용").isAnonymous(false).build();
        ReflectionTestUtils.setField(post, "id", 20L);
        Comment parent = Comment.builder().post(post).user(user).content("부모 댓글").isAnonymous(false).build();
        ReflectionTestUtils.setField(parent, "id", 30L);
        CommentCreateRequest request = new CommentCreateRequest();
        ReflectionTestUtils.setField(request, "content", "대댓글");
        ReflectionTestUtils.setField(request, "isAnonymous", false);
        ReflectionTestUtils.setField(request, "parentCommentId", 30L);
        when(posts.findByIdAndStatus(20L, PostStatus.ACTIVE)).thenReturn(Optional.of(post));
        when(users.findById(1L)).thenReturn(Optional.of(user));
        when(comments.findByIdAndStatus(30L, PostStatus.ACTIVE)).thenReturn(Optional.of(parent));
        when(comments.save(any(Comment.class))).thenAnswer(invocation -> {
            Comment reply = invocation.getArgument(0);
            ReflectionTestUtils.setField(reply, "id", 31L);
            return reply;
        });
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of()));

        var response = new CommentService(comments, posts, users, likes, events).create(20L, request);

        assertThat(response.getParentCommentId()).isEqualTo(30L);
        verify(events).publishEvent(any(CommentCreatedEvent.class));
    }
}
