package com.collab.task.dto;

import com.collab.task.domain.TaskLinkType;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record TaskLinkRequest(
        @NotNull TaskLinkType linkType,
        @NotNull UUID targetTaskId) {
}
