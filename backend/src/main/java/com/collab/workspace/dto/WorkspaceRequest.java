package com.collab.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WorkspaceRequest(
        @NotBlank @Size(min = 1, max = 128) String name,
        @Size(max = 2000) String description) {
}
