package com.universe.admin.school;

import com.universe.admin.school.dto.SchoolAdminDashboardResponse;
import com.universe.community.entity.CommunityPost;
import com.universe.community.entity.Hashtag;
import com.universe.community.entity.PostHashtag;
import com.universe.report.entity.Report;
import com.universe.report.entity.ReportType;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SchoolAdminService {

    private final EntityManager em;

    public SchoolAdminDashboardResponse getDashboardStats(Long schoolId) {
        // 1. 신고 유형별 통계 (Report stats by type for school)
        List<Object[]> reportStats = em.createQuery(
                "SELECT r.reportType, COUNT(r) FROM Report r " +
                "WHERE r.targetUser.school.id = :schoolId " +
                "GROUP BY r.reportType", Object[].class)
                .setParameter("schoolId", schoolId)
                .getResultList();

        Map<String, Long> reportReasonStats = new HashMap<>();
        for (Object[] stat : reportStats) {
            ReportType type = (ReportType) stat[0];
            Long count = (Long) stat[1];
            reportReasonStats.put(type.name(), count);
        }

        // 2. 해쉬태크 기준 상위 Top 5 (Top 5 Hashtags)
        List<Object[]> hashtagStats = em.createQuery(
                "SELECT ph.hashtag.name, COUNT(ph) FROM PostHashtag ph " +
                "JOIN ph.post p " +
                "WHERE p.school.id = :schoolId " +
                "GROUP BY ph.hashtag.name " +
                "ORDER BY COUNT(ph) DESC", Object[].class)
                .setParameter("schoolId", schoolId)
                .setMaxResults(5)
                .getResultList();

        List<SchoolAdminDashboardResponse.HashtagStat> topHashtags = hashtagStats.stream()
                .map(stat -> new SchoolAdminDashboardResponse.HashtagStat((String) stat[0], (Long) stat[1]))
                .collect(Collectors.toList());

        // 3. 커뮤니티 글 중에 인기도 상위 Top 5 (Top 5 Community posts by popularity)
        List<Object[]> topPostsStats = em.createQuery(
                "SELECT p, COUNT(pl) FROM CommunityPost p " +
                "LEFT JOIN PostLike pl ON pl.post = p " +
                "WHERE p.school.id = :schoolId " +
                "GROUP BY p " +
                "ORDER BY COUNT(pl) DESC, p.viewCount DESC", Object[].class)
                .setParameter("schoolId", schoolId)
                .setMaxResults(5)
                .getResultList();

        List<SchoolAdminDashboardResponse.PostStat> topPosts = topPostsStats.stream()
                .map(stat -> {
                    CommunityPost p = (CommunityPost) stat[0];
                    Long likeCount = (Long) stat[1];
                    return new SchoolAdminDashboardResponse.PostStat(p.getId(), p.getTitle(), likeCount.intValue(), p.getViewCount());
                })
                .collect(Collectors.toList());

        return SchoolAdminDashboardResponse.builder()
                .reportReasonStats(reportReasonStats)
                .topHashtags(topHashtags)
                .topPosts(topPosts)
                .build();
    }
}
