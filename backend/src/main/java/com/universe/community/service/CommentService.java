package com.universe.community.service;

import com.universe.community.dto.request.*;
import com.universe.community.dto.response.CommentResponse;
import com.universe.community.entity.*;
import com.universe.community.repository.*;
import com.universe.global.common.PageResponse;
import com.universe.global.exception.*;
import com.universe.global.security.CurrentUser;
import com.universe.notification.event.CommentCreatedEvent;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository comments;
    private final CommunityPostRepository posts;
    private final UserRepository users;
    private final CommentLikeRepository likes;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public PageResponse<CommentResponse> list(Long postId, int page, int size) {
        post(postId);
        var result = comments.findByPostIdAndStatusOrderByCreatedAtAsc(
                postId, PostStatus.ACTIVE,
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100)));
        Long viewerId = CurrentUser.id();
        return new PageResponse<>(result.map(comment -> response(comment, viewerId)));
    }

    @Transactional
    public CommentResponse create(Long postId, CommentCreateRequest request) {
        CommunityPost post = post(postId);
        User user = user();
        Comment parent = null;
        if (request.getParentCommentId() != null) {
            parent = comments.findByIdAndStatus(request.getParentCommentId(), PostStatus.ACTIVE)
                    .orElseThrow(() -> new BusinessException(ErrorCode.PARENT_COMMENT_NOT_FOUND));
            if (!parent.getPost().getId().equals(postId)) {
                throw new BusinessException(ErrorCode.PARENT_COMMENT_NOT_FOUND);
            }
            if (parent.getParentComment() != null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT);
            }
        }
        Comment saved = comments.save(Comment.builder()
                .post(post).user(user).parentComment(parent)
                .content(request.getContent()).isAnonymous(request.getIsAnonymous()).build());
        events.publishEvent(new CommentCreatedEvent(
                postId, post.getTitle(), post.getUser().getId(), user.getId(),
                parent == null ? null : parent.getUser().getId()));
        return response(saved, user.getId());
    }

    @Transactional
    public CommentResponse update(Long id, CommentUpdateRequest request) {
        Comment comment = activeComment(id);
        if (!comment.getUser().getId().equals(CurrentUser.id())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        comment.updateContent(request.getContent(), request.getIsAnonymous());
        return response(comment, CurrentUser.id());
    }

    @Transactional
    public void delete(Long id) {
        Comment comment = activeComment(id);
        if (!comment.getUser().getId().equals(CurrentUser.id())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        comment.deleteComment();
    }

    private CommentResponse response(Comment comment, Long viewerId) {
        return CommentResponse.from(comment, viewerId,
                likes.countByCommentId(comment.getId()),
                likes.existsByCommentIdAndUserId(comment.getId(), viewerId));
    }

    private Comment activeComment(Long id) {
        return comments.findByIdAndStatus(id, PostStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMENT_NOT_FOUND));
    }

    private CommunityPost post(Long id) {
        CommunityPost post = posts.findByIdAndStatus(id, PostStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));
        User user = user();
        if (user.getSchool() == null || !user.getSchool().getId().equals(post.getSchool().getId())) {
            throw new BusinessException(ErrorCode.CROSS_SCHOOL_ACCESS);
        }
        return post;
    }

    private User user() {
        return users.findById(CurrentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }
}
