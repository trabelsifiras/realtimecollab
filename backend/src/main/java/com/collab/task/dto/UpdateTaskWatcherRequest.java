package com.collab.task.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record UpdateTaskWatcherRequest(
        @NotNull UUID userId) {
}
