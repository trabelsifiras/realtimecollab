package com.collab.comment.controller;

import com.collab.comment.dto.CommentRequest;
import com.collab.comment.dto.CommentResponse;
import com.collab.comment.service.CommentService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Task Comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @PostMapping("/tasks/{taskId}/comments")
    @Operation(summary = "Add a comment to a task")
    public ResponseEntity<CommentResponse> create(@PathVariable UUID taskId, @Valid @RequestBody CommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.create(taskId, SecurityUtils.currentUserId(), request));
    }

    @GetMapping("/tasks/{taskId}/comments")
    @Operation(summary = "List comments on a task")
    public ResponseEntity<List<CommentResponse>> list(@PathVariable UUID taskId) {
        return ResponseEntity.ok(commentService.list(taskId, SecurityUtils.currentUserId()));
    }

    @PatchMapping("/comments/{id}")
    @Operation(summary = "Update a comment")
    public ResponseEntity<CommentResponse> update(@PathVariable UUID id, @Valid @RequestBody CommentRequest request) {
        return ResponseEntity.ok(commentService.update(id, SecurityUtils.currentUserId(), request));
    }

    @DeleteMapping("/comments/{id}")
    @Operation(summary = "Delete a comment (soft delete)")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        commentService.delete(id, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }
}
