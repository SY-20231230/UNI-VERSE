package com.universe.admin.school.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Getter
@NoArgsConstructor
public class SchoolAdminDashboardResponse {
    
    private Map<String, Long> reportReasonStats;
    private List<HashtagStat> topHashtags;
    private List<PostStat> topPosts;

    @Builder
    public SchoolAdminDashboardResponse(Map<String, Long> reportReasonStats, List<HashtagStat> topHashtags, List<PostStat> topPosts) {
        this.reportReasonStats = reportReasonStats;
        this.topHashtags = topHashtags;
        this.topPosts = topPosts;
    }

    @Getter
    @NoArgsConstructor
    public static class HashtagStat {
        private String tagName;
        private Long count;

        public HashtagStat(String tagName, Long count) {
            this.tagName = tagName;
            this.count = count;
        }
    }

    @Getter
    @NoArgsConstructor
    public static class PostStat {
        private Long postId;
        private String title;
        private Integer likeCount;
        private Integer viewCount;

        public PostStat(Long postId, String title, Integer likeCount, Integer viewCount) {
            this.postId = postId;
            this.title = title;
            this.likeCount = likeCount;
            this.viewCount = viewCount;
        }
    }
}
