package com.universe.community.repository;

import com.universe.community.entity.CommunityPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommunityPostRepositoryCustom {
    Page<CommunityPost> search(Long schoolId, String category, String keyword, String hashtag, String sort, Pageable pageable);
}
