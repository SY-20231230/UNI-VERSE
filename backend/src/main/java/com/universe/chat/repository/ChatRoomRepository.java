package com.universe.chat.repository;

import com.universe.chat.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    java.util.Optional<ChatRoom> findByRequestId(Long requestId);
}
