package com.collab.channel.dto;

import com.collab.channel.domain.ChannelType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record ChannelRequest(
        @NotNull ChannelType type,
        @Size(max = 128) String name,
        @Size(max = 2000) String description,
        List<UUID> memberIds) {
}
