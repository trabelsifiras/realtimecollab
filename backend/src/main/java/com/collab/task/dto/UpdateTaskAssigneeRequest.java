package com.collab.task.dto;

import java.util.UUID;

public record UpdateTaskAssigneeRequest(
        UUID assigneeId,
        Long version) {
}
