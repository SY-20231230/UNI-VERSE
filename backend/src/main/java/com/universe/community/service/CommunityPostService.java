package com.universe.community.service;

import com.universe.community.dto.request.PostCreateRequest;
import com.universe.community.dto.request.PostUpdateRequest;
import com.universe.community.dto.response.CommunityPostDetailResponse;
import com.universe.community.dto.response.CommunityPostListResponse;
import com.universe.community.dto.response.CommunityPostResponse;
import com.universe.community.entity.CommunityPost;
import com.universe.community.entity.Hashtag;
import com.universe.community.entity.PostHashtag;
import com.universe.community.entity.PostStatus;
import com.universe.community.repository.CommentRepository;
import com.universe.community.repository.CommunityPostRepository;
import com.universe.community.repository.HashtagRepository;
import com.universe.community.repository.PostCommentCount;
import com.universe.community.repository.PostHashtagRepository;
import com.universe.community.repository.PostLikeRepository;
import com.universe.global.common.PageResponse;
import com.universe.global.exception.BusinessException;
import com.universe.global.exception.ErrorCode;
import com.universe.global.security.CurrentUser;
import com.universe.school.repository.SchoolRepository;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommunityPostService {
    private final CommunityPostRepository posts;
    private final UserRepository users;
    private final SchoolRepository schools;
    private final HashtagRepository hashtags;
    private final PostHashtagRepository postHashtags;
    private final PostLikeRepository likes;
    private final CommentRepository comments;

    @Transactional(readOnly = true)
    public PageResponse<CommunityPostListResponse> list(
            String category,
            String keyword,
            String hashtag,
            String sort,
            int page,
            int size) {
        User user = currentUser();
        if (user.getSchool() == null || !Boolean.TRUE.equals(user.getSchoolVerified())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        Page<CommunityPost> result = posts.search(
                user.getSchool().getId(), category, keyword, hashtag, sort, pageable);
        Map<Long, Long> commentCounts = findCommentCounts(result.getContent());

        return new PageResponse<>(result.map(post -> toList(
                post, commentCounts.getOrDefault(post.getId(), 0L))));
    }

    @Transactional
    public CommunityPostResponse create(PostCreateRequest request) {
        User user = currentUser();
        if (user.getSchool() == null || !Boolean.TRUE.equals(user.getSchoolVerified())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        CommunityPost post = posts.save(CommunityPost.builder()
                .user(user)
                .school(user.getSchool())
                .category(request.getCategory())
                .title(request.getTitle())
                .content(request.getContent())
                .isAnonymous(request.getIsAnonymous())
                .build());
        saveHashtags(post, request.getHashtags());
        return toResponse(post);
    }

    @Transactional
    public CommunityPostDetailResponse detail(Long id) {
        CommunityPost post = posts.findByIdAndStatus(id, PostStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));
        if (!sameSchool(post)) {
            throw new BusinessException(ErrorCode.CROSS_SCHOOL_ACCESS);
        }
        post.increaseViewCount();
        return toDetail(post, CurrentUser.id());
    }

    @Transactional
    public CommunityPostResponse update(Long id, PostUpdateRequest request) {
        CommunityPost post = ownedPost(id);
        post.updateContent(
                request.getTitle(),
                request.getContent(),
                request.getCategory(),
                request.getIsAnonymous());
        boolean anonymous = Boolean.TRUE.equals(request.getIsAnonymous());
        comments.findByPostIdAndUserIdAndStatus(post.getId(), post.getUser().getId(), PostStatus.ACTIVE)
                .forEach(comment -> comment.changeAnonymity(anonymous));
        postHashtags.deleteByPostId(post.getId());
        saveHashtags(post, request.getHashtags());
        return toResponse(post);
    }

    @Transactional
    public void delete(Long id) {
        ownedPost(id).deletePost();
    }

    private Map<Long, Long> findCommentCounts(List<CommunityPost> pagePosts) {
        if (pagePosts.isEmpty()) {
            return Map.of();
        }
        List<Long> postIds = pagePosts.stream().map(CommunityPost::getId).toList();
        return comments.countByPostIdsAndStatus(postIds, PostStatus.ACTIVE).stream()
                .collect(Collectors.toMap(
                        PostCommentCount::postId,
                        PostCommentCount::commentCount,
                        (left, right) -> left));
    }

    private CommunityPost ownedPost(Long id) {
        CommunityPost post = posts.findByIdAndStatus(id, PostStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));
        if (!post.getUser().getId().equals(CurrentUser.id())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return post;
    }

    private boolean sameSchool(CommunityPost post) {
        User user = currentUser();
        return user.getSchool() != null && user.getSchool().getId().equals(post.getSchool().getId());
    }

    private User currentUser() {
        return users.findById(CurrentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    private void saveHashtags(CommunityPost post, List<String> names) {
        if (names == null) {
            return;
        }
        names.stream()
                .filter(name -> name != null && !name.isBlank())
                .map(String::trim)
                .distinct()
                .forEach(name -> {
                    Hashtag hashtag = hashtags.findByName(name)
                            .orElseGet(() -> hashtags.save(Hashtag.builder().name(name).build()));
                    postHashtags.save(PostHashtag.builder().post(post).hashtag(hashtag).build());
                });
    }

    private CommunityPostResponse toResponse(CommunityPost post) {
        return new CommunityPostResponse(
                post.getId(),
                post.getCategory().name(),
                post.getTitle(),
                post.getContent(),
                Boolean.TRUE.equals(post.getIsAnonymous()),
                post.getUser().getId(),
                post.getSchool().getId());
    }

    private CommunityPostListResponse toList(CommunityPost post, long commentCount) {
        boolean anonymous = Boolean.TRUE.equals(post.getIsAnonymous());
        String preview = post.getContent().length() > 100
                ? post.getContent().substring(0, 100)
                : post.getContent();
        return new CommunityPostListResponse(
                post.getId(),
                post.getCategory().name(),
                post.getTitle(),
                preview,
                anonymous,
                anonymous ? null : post.getUser().getId(),
                anonymous ? "익명" : post.getUser().getNickname(),
                post.getViewCount(),
                likes.countByPostId(post.getId()),
                commentCount,
                post.getCreatedAt(),
                postHashtags.findByPostId(post.getId()).stream()
                        .map(postHashtag -> postHashtag.getHashtag().getName())
                        .toList());
    }

    private CommunityPostDetailResponse toDetail(CommunityPost post, Long currentUserId) {
        boolean mine = post.getUser().getId().equals(currentUserId);
        boolean anonymous = Boolean.TRUE.equals(post.getIsAnonymous());
        Long returnedAuthorId = anonymous && !mine ? null : post.getUser().getId();
        return new CommunityPostDetailResponse(
                post.getId(),
                post.getCategory().name(),
                post.getTitle(),
                post.getContent(),
                anonymous,
                returnedAuthorId,
                anonymous ? "익명" : post.getUser().getNickname(),
                post.getSchool().getId(),
                post.getViewCount(),
                likes.countByPostId(post.getId()),
                likes.existsByPostIdAndUserId(post.getId(), currentUserId),
                post.getCreatedAt(),
                post.getUpdatedAt(),
                postHashtags.findByPostId(post.getId()).stream()
                        .map(postHashtag -> postHashtag.getHashtag().getName())
                        .toList());
    }
}
