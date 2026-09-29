package com.universe.chat.repository;

import com.universe.chat.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByRoomIdOrderByCreatedAtAsc(Long roomId);
    void deleteByRoomId(Long roomId);

    Optional<Message> findFirstByRoomIdOrderByIdDesc(Long roomId);

    /** 내가 마지막으로 읽은 메시지(afterId) 이후에 상대가 보낸 메시지 수 */
    @Query("select count(m) from Message m where m.room.id = :roomId and m.sender.id <> :userId and m.id > :afterId")
    long countUnread(@Param("roomId") Long roomId, @Param("userId") Long userId, @Param("afterId") Long afterId);
}
