package com.collab.chat.controller;

import com.collab.chat.dto.MessageRequest;
import com.collab.chat.dto.MessageResponse;
import com.collab.chat.service.MessageService;
import com.collab.common.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @PostMapping("/channels/{channelId}/messages")
    @Operation(summary = "Send a message to a channel")
    public ResponseEntity<MessageResponse> send(@PathVariable UUID channelId, @Valid @RequestBody MessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(messageService.send(channelId, SecurityUtils.currentUserId(), request));
    }

    @GetMapping("/channels/{channelId}/messages")
    @Operation(summary = "List channel messages (cursor pagination)")
    public ResponseEntity<List<MessageResponse>> list(
            @PathVariable UUID channelId,
            @RequestParam(required = false) UUID before,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(messageService.list(channelId, SecurityUtils.currentUserId(), before, limit));
    }

    @PatchMapping("/messages/{id}")
    @Operation(summary = "Edit a message")
    public ResponseEntity<MessageResponse> update(@PathVariable UUID id, @Valid @RequestBody MessageRequest request) {
        return ResponseEntity.ok(messageService.update(id, SecurityUtils.currentUserId(), request));
    }

    @DeleteMapping("/messages/{id}")
    @Operation(summary = "Delete a message (soft delete)")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        messageService.delete(id, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }
}
