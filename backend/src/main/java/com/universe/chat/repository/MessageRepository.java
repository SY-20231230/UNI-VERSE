package com.universe.chat.repository;

import com.universe.chat.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByRoomIdOrderByCreatedAtAsc(Long roomId);
    void deleteByRoomId(Long roomId);
}
