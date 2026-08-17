package com.collab.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record MessageRequest(
        @NotBlank @Size(max = 5000) String content,
        UUID replyToMessageId) {
}
