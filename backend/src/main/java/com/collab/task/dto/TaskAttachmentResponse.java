package com.collab.task.dto;

import com.collab.task.domain.TaskAttachment;

import java.time.Instant;
import java.util.UUID;

public record TaskAttachmentResponse(
        UUID id,
        UUID taskId,
        UUID uploaderId,
        String fileName,
        String contentType,
        Long sizeBytes,
        Instant createdAt) {

    public static TaskAttachmentResponse from(TaskAttachment attachment) {
        return new TaskAttachmentResponse(
                attachment.getId(),
                attachment.getTaskId(),
                attachment.getUploaderId(),
                attachment.getFileName(),
                attachment.getContentType(),
                attachment.getSizeBytes(),
                attachment.getCreatedAt());
    }
}
