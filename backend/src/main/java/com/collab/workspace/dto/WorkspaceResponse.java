package com.collab.workspace.dto;

import com.collab.workspace.domain.Workspace;

import java.time.Instant;
import java.util.UUID;

public record WorkspaceResponse(
        UUID id,
        String name,
        String description,
        String slug,
        UUID ownerId,
        String avatarUrl,
        Instant createdAt,
        Instant updatedAt) {

    public static WorkspaceResponse from(Workspace workspace) {
        return new WorkspaceResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                workspace.getSlug(),
                workspace.getOwnerId(),
                workspace.getAvatarUrl(),
                workspace.getCreatedAt(),
                workspace.getUpdatedAt());
    }
}
