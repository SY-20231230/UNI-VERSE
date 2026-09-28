package com.universe.chat.repository;

import com.universe.chat.entity.ChatMember;
import com.universe.chat.entity.ChatMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMemberRepository extends JpaRepository<ChatMember, ChatMemberId> {
    List<ChatMember> findByUserId(Long userId);
    List<ChatMember> findByRoomId(Long roomId);
}
