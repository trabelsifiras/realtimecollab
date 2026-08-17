package com.collab.chat.dto;

import com.collab.chat.domain.Message;

import java.time.Instant;
import java.util.UUID;

public record MessageResponse(
        UUID id,
        UUID channelId,
        UUID senderId,
        String content,
        UUID replyToMessageId,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt) {

    public static MessageResponse from(Message message) {
        return new MessageResponse(
                message.getId(),
                message.getChannelId(),
                message.getSenderId(),
                message.getContent(),
                message.getReplyToMessageId(),
                message.getCreatedAt(),
                message.getUpdatedAt(),
                message.getDeletedAt());
    }
}
