package com.universe.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter @RequiredArgsConstructor
public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "입력값이 올바르지 않습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "대상을 찾을 수 없습니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "DUPLICATE_EMAIL", "이미 가입된 이메일입니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다."),
    INACTIVE_ACCOUNT(HttpStatus.FORBIDDEN, "INACTIVE_ACCOUNT", "사용할 수 없는 계정입니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "유효하지 않은 토큰입니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "유효하지 않은 Refresh Token입니다."),
    SCHOOL_NOT_FOUND(HttpStatus.NOT_FOUND, "SCHOOL_NOT_FOUND", "학교를 찾을 수 없습니다."),
    SCHOOL_NOT_ACTIVE(HttpStatus.BAD_REQUEST, "SCHOOL_NOT_ACTIVE", "인증할 수 없는 학교입니다."),
    SCHOOL_EMAIL_DOMAIN_MISMATCH(HttpStatus.BAD_REQUEST, "SCHOOL_EMAIL_DOMAIN_MISMATCH", "학교 이메일 도메인이 학교와 일치하지 않습니다."),
    VERIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "VERIFICATION_NOT_FOUND", "학교 인증 요청을 찾을 수 없습니다."),
    VERIFICATION_EXPIRED(HttpStatus.BAD_REQUEST, "VERIFICATION_EXPIRED", "학교 인증코드가 만료되었습니다."),
    VERIFICATION_CODE_MISMATCH(HttpStatus.BAD_REQUEST, "VERIFICATION_CODE_MISMATCH", "학교 인증코드가 일치하지 않습니다."),
    ALREADY_VERIFIED(HttpStatus.CONFLICT, "ALREADY_VERIFIED", "이미 학교 인증이 완료되었습니다."),
    POST_NOT_FOUND(HttpStatus.NOT_FOUND, "POST_NOT_FOUND", "게시글을 찾을 수 없습니다."),
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMENT_NOT_FOUND", "댓글을 찾을 수 없습니다."),
    HASHTAG_NOT_FOUND(HttpStatus.NOT_FOUND, "HASHTAG_NOT_FOUND", "해시태그를 찾을 수 없습니다."),
    LIKE_ALREADY_EXISTS(HttpStatus.CONFLICT, "LIKE_ALREADY_EXISTS", "이미 좋아요를 등록했습니다."),
    LIKE_NOT_FOUND(HttpStatus.NOT_FOUND, "LIKE_NOT_FOUND", "좋아요를 찾을 수 없습니다."),
    PARENT_COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "PARENT_COMMENT_NOT_FOUND", "부모 댓글을 찾을 수 없습니다."),
    CROSS_SCHOOL_ACCESS(HttpStatus.FORBIDDEN, "CROSS_SCHOOL_ACCESS", "같은 학교의 사용자만 접근할 수 있습니다."),
    MAIL_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "MAIL_NOT_CONFIGURED", "학교 인증 메일 서비스가 설정되지 않았습니다.");

    private final HttpStatus status; private final String code; private final String message;
}
