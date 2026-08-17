package com.collab.channel.repository;

import com.collab.channel.domain.ChannelMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ChannelMemberRepository extends JpaRepository<ChannelMember, UUID> {

    boolean existsByChannelIdAndUserId(UUID channelId, UUID userId);

    void deleteByChannelIdAndUserId(UUID channelId, UUID userId);

    List<ChannelMember> findAllByChannelId(UUID channelId);

    @Query("""
            select m.channelId from ChannelMember m where m.userId = :userId
            """)
    List<UUID> findChannelIdsByUserId(@Param("userId") UUID userId);
}
