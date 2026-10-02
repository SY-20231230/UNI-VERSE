package com.universe.community.service;

import com.universe.community.dto.response.CommentLikeResponse;
import com.universe.community.entity.*;
import com.universe.community.repository.*;
import com.universe.global.exception.*;
import com.universe.global.security.CurrentUser;
import com.universe.user.entity.User;
import com.universe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentLikeService {
    private final CommentLikeRepository likes;
    private final CommentRepository comments;
    private final UserRepository users;

    @Transactional
    public CommentLikeResponse like(Long commentId) {
        Comment comment = activeComment(commentId);
        User user = currentUser(comment);
        if (!likes.existsByCommentIdAndUserId(commentId, user.getId())) {
            likes.save(CommentLike.builder().comment(comment).user(user).build());
        }
        return response(commentId, true);
    }

    @Transactional
    public CommentLikeResponse unlike(Long commentId) {
        Comment comment = activeComment(commentId);
        User user = currentUser(comment);
        likes.findByCommentIdAndUserId(commentId, user.getId()).ifPresent(likes::delete);
        return response(commentId, false);
    }

    private Comment activeComment(Long commentId) {
        return comments.findByIdAndStatus(commentId, PostStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMENT_NOT_FOUND));
    }

    private User currentUser(Comment comment) {
        User user = users.findById(CurrentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        if (user.getSchool() == null
                || !user.getSchool().getId().equals(comment.getPost().getSchool().getId())) {
            throw new BusinessException(ErrorCode.CROSS_SCHOOL_ACCESS);
        }
        return user;
    }

    private CommentLikeResponse response(Long commentId, boolean liked) {
        return new CommentLikeResponse(commentId, liked, likes.countByCommentId(commentId));
    }
}
