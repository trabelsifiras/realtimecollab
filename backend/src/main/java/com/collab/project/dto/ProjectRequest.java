package com.collab.project.dto;

import com.collab.project.domain.ProjectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProjectRequest(
        @NotBlank @Size(min = 1, max = 128) String name,
        @Size(max = 2000) String description,
        @Size(max = 16) String key,
        ProjectStatus status) {
}
