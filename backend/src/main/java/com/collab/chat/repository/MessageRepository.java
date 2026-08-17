package com.collab.chat.repository;

import com.collab.chat.domain.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    @Query("""
            select m from Message m
            where m.channelId = :channelId and m.deletedAt is null
            order by m.createdAt desc
            """)
    List<Message> findLatest(@Param("channelId") UUID channelId, Pageable pageable);

    @Query("""
            select m from Message m
            where m.channelId = :channelId and m.deletedAt is null and m.createdAt < :before
            order by m.createdAt desc
            """)
    List<Message> findBefore(@Param("channelId") UUID channelId,
                             @Param("before") Instant before,
                             Pageable pageable);
}
