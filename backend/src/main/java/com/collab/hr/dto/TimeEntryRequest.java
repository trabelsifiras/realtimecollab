package com.collab.hr.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record TimeEntryRequest(
        @NotNull UUID projectId,
        UUID taskId,
        @NotNull LocalDate entryDate,
        @NotNull @Min(1) @Max(1440) Integer durationMinutes,
        @Size(max = 2000) String description) {
}
