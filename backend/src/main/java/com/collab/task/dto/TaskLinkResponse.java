package com.collab.task.dto;

import com.collab.task.domain.Task;
import com.collab.task.domain.TaskLink;
import com.collab.task.domain.TaskLinkType;

import java.time.Instant;
import java.util.UUID;

public record TaskLinkResponse(
        UUID id,
        UUID sourceTaskId,
        UUID targetTaskId,
        TaskLinkType linkType,
        boolean inbound,
        String targetKey,
        String targetTitle,
        TaskStatusSummary targetStatus,
        Instant createdAt) {

    public record TaskStatusSummary(String value) {
    }

    /**
     * Builds a response relative to the given task, marking whether the link
     * points towards or away from it and resolving the "other end" of the link.
     */
    public static TaskLinkResponse from(TaskLink link, UUID perspectiveTaskId, Task other) {
        boolean inbound = link.getTargetTaskId().equals(perspectiveTaskId);
        return new TaskLinkResponse(
                link.getId(),
                link.getSourceTaskId(),
                link.getTargetTaskId(),
                link.getLinkType(),
                inbound,
                other != null ? other.getKey() : null,
                other != null ? other.getTitle() : null,
                other != null ? new TaskStatusSummary(other.getStatus().name()) : null,
                link.getCreatedAt());
    }
}
