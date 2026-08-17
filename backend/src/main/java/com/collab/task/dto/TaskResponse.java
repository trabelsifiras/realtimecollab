package com.collab.task.dto;

import com.collab.task.domain.Task;
import com.collab.task.domain.TaskPriority;
import com.collab.task.domain.TaskStatus;
import com.collab.task.domain.TaskType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        String key,
        UUID projectId,
        String title,
        String description,
        TaskType type,
        TaskStatus status,
        TaskPriority priority,
        UUID assigneeId,
        UUID creatorId,
        UUID parentId,
        UUID epicId,
        Integer storyPoints,
        List<String> labels,
        List<UUID> watchers,
        Instant startDate,
        Instant dueDate,
        Integer originalEstimateMinutes,
        Integer remainingEstimateMinutes,
        Integer loggedMinutes,
        Integer position,
        Long version,
        Instant createdAt,
        Instant updatedAt,
        Instant completedAt) {

    public static TaskResponse from(Task task) {
        List<UUID> watchers = task.getWatchers() == null
                ? List.of()
                : task.getWatchers().stream().sorted().toList();
        List<String> labels = task.getLabels() == null
                ? List.of()
                : task.getLabels().stream().sorted().toList();

        return new TaskResponse(
                task.getId(),
                task.getKey(),
                task.getProjectId(),
                task.getTitle(),
                task.getDescription(),
                task.getType(),
                task.getStatus(),
                task.getPriority(),
                task.getAssigneeId(),
                task.getCreatorId(),
                task.getParentId(),
                task.getEpicId(),
                task.getStoryPoints(),
                labels,
                watchers,
                task.getStartDate(),
                task.getDueDate(),
                task.getOriginalEstimateMinutes(),
                task.getRemainingEstimateMinutes(),
                task.getLoggedMinutes(),
                task.getPosition(),
                task.getVersion(),
                task.getCreatedAt(),
                task.getUpdatedAt(),
                task.getCompletedAt());
    }
}
