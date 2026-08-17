package com.collab.workspace.dto;

import com.collab.user.dto.UserResponse;
import com.collab.workspace.domain.WorkspaceMember;
import com.collab.workspace.domain.WorkspaceRole;

import java.time.Instant;
import java.util.UUID;

public record WorkspaceMemberResponse(
        UUID id,
        UUID userId,
        UUID workspaceId,
        WorkspaceRole role,
        Instant createdAt,
        UserResponse user) {

    public static WorkspaceMemberResponse from(WorkspaceMember member, UserResponse user) {
        return new WorkspaceMemberResponse(
                member.getId(),
                member.getUserId(),
                member.getWorkspaceId(),
                member.getRole(),
                member.getCreatedAt(),
                user);
    }
}
