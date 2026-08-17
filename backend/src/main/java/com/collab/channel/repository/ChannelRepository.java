package com.collab.channel.repository;

import com.collab.channel.domain.Channel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChannelRepository extends JpaRepository<Channel, UUID> {

    List<Channel> findAllByWorkspaceIdOrderByCreatedAtAsc(UUID workspaceId);
}
