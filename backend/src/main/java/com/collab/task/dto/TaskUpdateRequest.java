package com.collab.task.dto;

import com.collab.task.domain.TaskPriority;
import com.collab.task.domain.TaskStatus;
import com.collab.task.domain.TaskType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record TaskUpdateRequest(
        @Size(max = 255) String title,
        @Size(max = 10000) String description,
        TaskStatus status,
        TaskPriority priority,
        UUID assigneeId,
        Instant dueDate,
        TaskType type,
        @PositiveOrZero @Max(10000) Integer storyPoints,
        Instant startDate,
        @PositiveOrZero @Max(100000000) Integer originalEstimateMinutes,
        @PositiveOrZero @Max(100000000) Integer remainingEstimateMinutes,
        Long version) {
}
