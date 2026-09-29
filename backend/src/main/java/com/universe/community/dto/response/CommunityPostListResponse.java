package com.universe.community.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
public class CommunityPostListResponse {
    private Long postId;
    private String category;
    private String title;
    private String preview;
    private boolean anonymous;
    private Long authorId;
    private String authorName;
    private int viewCount;
    private long likeCount;
    private long commentCount;
    private LocalDateTime createdAt;
    private List<String> hashtags;
}
