package com.universe.community.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "post_hashtags")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(PostHashtagId.class)
public class PostHashtag {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private CommunityPost post;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hashtag_id", nullable = false)
    private Hashtag hashtag;

    @Builder
    public PostHashtag(CommunityPost post, Hashtag hashtag) {
        this.post = post;
        this.hashtag = hashtag;
    }
}
