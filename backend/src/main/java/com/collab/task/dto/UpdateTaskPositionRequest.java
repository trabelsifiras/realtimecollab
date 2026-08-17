package com.collab.task.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateTaskPositionRequest(
        @NotNull Integer position,
        Long version) {
}
