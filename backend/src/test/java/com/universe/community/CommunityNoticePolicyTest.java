package com.universe.community;

import com.universe.community.dto.request.PostCreateRequest;
import com.universe.community.entity.*;
import com.universe.community.repository.*;
import com.universe.community.service.CommunityPostService;
import com.universe.global.exception.BusinessException;
import com.universe.school.entity.School;
import com.universe.school.repository.SchoolRepository;
import com.universe.user.entity.*;
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

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommunityNoticePolicyTest {
    @Mock CommunityPostRepository posts;
    @Mock UserRepository users;
    @Mock SchoolRepository schools;
    @Mock HashtagRepository hashtags;
    @Mock PostHashtagRepository postHashtags;
    @Mock PostLikeRepository likes;
    @Mock CommentRepository comments;

    CommunityPostService service;
    School school;

    @BeforeEach
    void setUp() {
        school = School.builder().schoolName("멀티버스대학교").emailDomain("multiverse.ac.kr").build();
        ReflectionTestUtils.setField(school, "id", 2L);
        service = new CommunityPostService(posts, users, schools, hashtags, postHashtags, likes, comments);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(10L, null, List.of()));
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void regularUserCannotCreateNotice() {
        when(users.findById(10L)).thenReturn(Optional.of(user(UserRole.USER)));

        assertThatThrownBy(() -> service.create(noticeRequest()))
                .isInstanceOf(BusinessException.class);
        verify(posts, never()).save(any());
    }

    @Test
    void schoolAdminCreatesNamedNotice() {
        when(users.findById(10L)).thenReturn(Optional.of(user(UserRole.SCHOOL_ADMIN)));
        when(posts.save(any())).thenAnswer(invocation -> {
            CommunityPost post = invocation.getArgument(0);
            ReflectionTestUtils.setField(post, "id", 99L);
            return post;
        });

        var response = service.create(noticeRequest());

        assertThat(response.getCategory()).isEqualTo("NOTICE");
        assertThat(response.isAnonymous()).isFalse();
    }

    private User user(UserRole role) {
        User user = User.builder().email("admin@multiverse.ac.kr").password("secret")
                .name("관리자").nickname("학교관리자").build();
        ReflectionTestUtils.setField(user, "id", 10L);
        ReflectionTestUtils.setField(user, "role", role);
        user.verifySchool(school);
        return user;
    }

    private PostCreateRequest noticeRequest() {
        PostCreateRequest request = new PostCreateRequest();
        ReflectionTestUtils.setField(request, "category", PostCategory.NOTICE);
        ReflectionTestUtils.setField(request, "title", "학교 공지");
        ReflectionTestUtils.setField(request, "content", "공지 내용");
        ReflectionTestUtils.setField(request, "isAnonymous", true);
        ReflectionTestUtils.setField(request, "hashtags", List.of());
        return request;
    }
}
