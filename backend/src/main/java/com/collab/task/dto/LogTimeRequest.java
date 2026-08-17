package com.collab.task.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.PositiveOrZero;

public record LogTimeRequest(
        @PositiveOrZero @Max(100000000) Integer minutes,
        Long version) {
}
