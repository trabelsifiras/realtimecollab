package com.collab.task.dto;

import com.collab.task.domain.TaskActivity;
import com.collab.task.domain.TaskActivityType;

import java.time.Instant;
import java.util.UUID;

public record TaskActivityResponse(
        UUID id,
        UUID taskId,
        UUID actorId,
        TaskActivityType type,
        String field,
        String oldValue,
        String newValue,
        Instant createdAt) {

    public static TaskActivityResponse from(TaskActivity activity) {
        return new TaskActivityResponse(
                activity.getId(),
                activity.getTaskId(),
                activity.getActorId(),
                activity.getType(),
                activity.getField(),
                activity.getOldValue(),
                activity.getNewValue(),
                activity.getCreatedAt());
    }
}
