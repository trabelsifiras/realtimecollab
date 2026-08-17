package com.collab.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddTaskLabelRequest(
        @NotBlank @Size(max = 64) String label) {
}
