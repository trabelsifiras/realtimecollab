package com.collab.hr.dto;

import com.collab.hr.domain.LeaveStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewLeaveRequestRequest(
        @NotNull LeaveStatus status,
        @Size(max = 1000) String reviewNote) {
}
