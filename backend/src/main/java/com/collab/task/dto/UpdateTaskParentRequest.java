package com.collab.task.dto;

import java.util.UUID;

public record UpdateTaskParentRequest(
        UUID parentId,
        Long version) {
}
