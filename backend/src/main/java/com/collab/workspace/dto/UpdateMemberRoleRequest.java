package com.collab.workspace.dto;

import com.collab.workspace.domain.WorkspaceRole;
import jakarta.validation.constraints.NotNull;

public record UpdateMemberRoleRequest(@NotNull WorkspaceRole role) {
}
