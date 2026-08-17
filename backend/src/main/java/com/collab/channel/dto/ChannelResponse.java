package com.collab.channel.dto;

import com.collab.channel.domain.Channel;
import com.collab.channel.domain.ChannelType;

import java.time.Instant;
import java.util.UUID;

public record ChannelResponse(
        UUID id,
        UUID workspaceId,
        String name,
        String description,
        ChannelType type,
        UUID createdBy,
        Instant createdAt,
        Instant updatedAt) {

    public static ChannelResponse from(Channel channel) {
        return new ChannelResponse(
                channel.getId(),
                channel.getWorkspaceId(),
                channel.getName(),
                channel.getDescription(),
                channel.getType(),
                channel.getCreatedBy(),
                channel.getCreatedAt(),
                channel.getUpdatedAt());
    }
}
