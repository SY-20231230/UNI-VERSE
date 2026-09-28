package com.universe.community;

import com.universe.community.dto.request.PostUpdateRequest;
import com.universe.community.entity.CommunityPost;
import com.universe.community.entity.PostCategory;
import com.universe.community.entity.PostStatus;
import com.universe.community.repository.CommunityPostRepository;
import com.universe.community.repository.HashtagRepository;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommunityPostAnonymityTest {
    @Mock CommunityPostRepository posts;
    @Mock UserRepository users;
    @Mock SchoolRepository schools;
    @Mock HashtagRepository hashtags;
    @Mock PostHashtagRepository postHashtags;
    @Mock PostLikeRepository likes;

    CommunityPostService service;
    CommunityPost post;

    @BeforeEach
    void setUp() {
        School school = School.builder().schoolName("서울대학교").emailDomain("snu.ac.kr").build();
        ReflectionTestUtils.setField(school, "id", 10L);
        User author = User.builder().email("author@test.example").password("secret")
                .name("작성자").nickname("닉네임").build();
        ReflectionTestUtils.setField(author, "id", 1L);
        author.verifySchool(school);
        post = CommunityPost.builder().user(author).school(school).category(PostCategory.FREE)
                .title("제목").content("내용").isAnonymous(true).build();
        ReflectionTestUtils.setField(post, "id", 20L);
        service = new CommunityPostService(posts, users, schools, hashtags, postHashtags, likes);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(1L, null, List.of()));
        when(posts.findByIdAndStatus(20L, PostStatus.ACTIVE)).thenReturn(Optional.of(post));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void anonymousPostCanBeChangedToNicknamePost() {
        var response = service.update(20L, request(false));

        assertThat(post.getIsAnonymous()).isFalse();
        assertThat(response.isAnonymous()).isFalse();
        verify(postHashtags).deleteByPostId(20L);
    }

    @Test
    void nicknamePostCanBeChangedBackToAnonymousPost() {
        service.update(20L, request(false));
        var response = service.update(20L, request(true));

        assertThat(post.getIsAnonymous()).isTrue();
        assertThat(response.isAnonymous()).isTrue();
    }

    private PostUpdateRequest request(boolean anonymous) {
        PostUpdateRequest request = new PostUpdateRequest();
        ReflectionTestUtils.setField(request, "category", PostCategory.FREE);
        ReflectionTestUtils.setField(request, "title", "수정 제목");
        ReflectionTestUtils.setField(request, "content", "수정 내용");
        ReflectionTestUtils.setField(request, "hashtags", List.of());
        ReflectionTestUtils.setField(request, "isAnonymous", anonymous);
        return request;
    }
}
