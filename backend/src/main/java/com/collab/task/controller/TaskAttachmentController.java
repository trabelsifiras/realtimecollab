package com.collab.task.controller;

import com.collab.common.security.SecurityUtils;
import com.collab.task.dto.TaskAttachmentResponse;
import com.collab.task.service.TaskAttachmentDownload;
import com.collab.task.service.TaskAttachmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Task Attachments")
public class TaskAttachmentController {

    private final TaskAttachmentService attachmentService;

    public TaskAttachmentController(TaskAttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @PostMapping(value = "/tasks/{taskId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload an attachment to a task")
    public ResponseEntity<TaskAttachmentResponse> upload(@PathVariable UUID taskId,
                                                         @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attachmentService.upload(taskId, SecurityUtils.currentUserId(), file));
    }

    @GetMapping("/tasks/{taskId}/attachments")
    @Operation(summary = "List attachments on a task")
    public ResponseEntity<List<TaskAttachmentResponse>> list(@PathVariable UUID taskId) {
        return ResponseEntity.ok(attachmentService.list(taskId, SecurityUtils.currentUserId()));
    }

    @GetMapping("/attachments/{id}/download")
    @Operation(summary = "Download an attachment")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        TaskAttachmentDownload download = attachmentService.download(id, SecurityUtils.currentUserId());
        MediaType mediaType = download.contentType() == null
                ? MediaType.APPLICATION_OCTET_STREAM
                : MediaType.parseMediaType(download.contentType());
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + download.fileName() + "\"")
                .body(download.resource());
    }

    @DeleteMapping("/attachments/{id}")
    @Operation(summary = "Delete an attachment")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        attachmentService.delete(id, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }
}
