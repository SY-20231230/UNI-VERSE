package com.universe.chat.repository;

import com.universe.chat.entity.ChatRequest;
import com.universe.chat.entity.ChatRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatRequestRepository extends JpaRepository<ChatRequest, Long> {
    List<ChatRequest> findByReceiverIdAndStatusOrderByCreatedAtDesc(Long receiverId, ChatRequestStatus status);
    List<ChatRequest> findByRequesterIdOrderByCreatedAtDesc(Long requesterId);
}
