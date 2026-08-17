package com.collab.task.dto;

import java.time.Instant;

public record UpdateTaskDatesRequest(
        Instant startDate,
        Instant dueDate,
        Long version) {
}
