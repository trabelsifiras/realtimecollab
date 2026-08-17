package com.collab.task.dto;

import com.collab.task.domain.TaskPriority;
import com.collab.task.domain.TaskStatus;
import com.collab.task.domain.TaskType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TaskRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 10000) String description,
        TaskStatus status,
        TaskPriority priority,
        UUID assigneeId,
        Instant dueDate,
        TaskType type,
        UUID parentId,
        UUID epicId,
        @PositiveOrZero @Max(10000) Integer storyPoints,
        List<String> labels,
        Instant startDate,
        @PositiveOrZero @Max(100000000) Integer originalEstimateMinutes,
        @PositiveOrZero @Max(100000000) Integer remainingEstimateMinutes) {
}
