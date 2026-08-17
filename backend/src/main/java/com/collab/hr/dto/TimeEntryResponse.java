package com.collab.hr.dto;

import com.collab.hr.domain.TimeEntry;
import com.collab.hr.domain.TimeEntryStatus;
import com.collab.project.domain.Project;
import com.collab.task.domain.Task;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record TimeEntryResponse(
        UUID id,
        UUID workspaceId,
        UUID userId,
        UUID projectId,
        String projectName,
        UUID taskId,
        String taskTitle,
        LocalDate entryDate,
        Integer durationMinutes,
        String description,
        TimeEntryStatus status,
        Instant submittedAt,
        UUID reviewedBy,
        Instant reviewedAt,
        String rejectionReason,
        Instant createdAt,
        Instant updatedAt) {

    public static TimeEntryResponse from(TimeEntry entry, Project project, Task task) {
        return new TimeEntryResponse(
                entry.getId(),
                entry.getWorkspaceId(),
                entry.getUserId(),
                entry.getProjectId(),
                project != null ? project.getName() : null,
                entry.getTaskId(),
                task != null ? task.getTitle() : null,
                entry.getEntryDate(),
                entry.getDurationMinutes(),
                entry.getDescription(),
                entry.getStatus(),
                entry.getSubmittedAt(),
                entry.getReviewedBy(),
                entry.getReviewedAt(),
                entry.getRejectionReason(),
                entry.getCreatedAt(),
                entry.getUpdatedAt());
    }
}
