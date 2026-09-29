package com.universe.community.repository;

import com.universe.community.entity.PostHashtag;
import com.universe.community.entity.PostHashtagId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PostHashtagRepository extends JpaRepository<PostHashtag, PostHashtagId> {
    List<PostHashtag> findByPostId(Long postId);
    void deleteByPostId(Long postId);
}
