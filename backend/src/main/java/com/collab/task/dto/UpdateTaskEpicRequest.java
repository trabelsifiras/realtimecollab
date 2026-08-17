package com.collab.task.dto;

import java.util.UUID;

public record UpdateTaskEpicRequest(
        UUID epicId,
        Long version) {
}
