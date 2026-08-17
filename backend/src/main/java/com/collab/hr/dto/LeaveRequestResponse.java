package com.collab.hr.dto;

import com.collab.hr.domain.LeaveRequest;
import com.collab.hr.domain.LeaveStatus;
import com.collab.hr.domain.LeaveType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record LeaveRequestResponse(
        UUID id,
        UUID workspaceId,
        UUID userId,
        LeaveType type,
        LocalDate startDate,
        LocalDate endDate,
        String reason,
        LeaveStatus status,
        UUID reviewedBy,
        Instant reviewedAt,
        String reviewNote,
        Instant createdAt,
        Instant updatedAt) {

    public static LeaveRequestResponse from(LeaveRequest request) {
        return new LeaveRequestResponse(
                request.getId(),
                request.getWorkspaceId(),
                request.getUserId(),
                request.getType(),
                request.getStartDate(),
                request.getEndDate(),
                request.getReason(),
                request.getStatus(),
                request.getReviewedBy(),
                request.getReviewedAt(),
                request.getReviewNote(),
                request.getCreatedAt(),
                request.getUpdatedAt());
    }
}
