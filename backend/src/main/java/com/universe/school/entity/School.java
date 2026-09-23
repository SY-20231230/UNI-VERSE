package com.universe.school.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "schools")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class School {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "school_id")
    private Long id;

    @Column(name = "school_name", nullable = false, length = 100, unique = true)
    private String schoolName;

    @Column(name = "email_domain", length = 100, unique = true)
    private String emailDomain;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SchoolStatus status;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public School(String schoolName, String emailDomain) {
        this.schoolName = schoolName;
        this.emailDomain = emailDomain;
        this.status = SchoolStatus.ACTIVE;
    }

    public void changeStatus(SchoolStatus status) {
        this.status = status;
    }
}
