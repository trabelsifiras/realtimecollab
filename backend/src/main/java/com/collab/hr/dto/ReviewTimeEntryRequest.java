package com.collab.hr.dto;

import com.collab.hr.domain.TimeEntryStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewTimeEntryRequest(
        @NotNull TimeEntryStatus status,
        @Size(max = 1000) String rejectionReason) {
}
