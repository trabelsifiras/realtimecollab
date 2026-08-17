package com.collab.task.service;

import com.collab.common.exception.BadRequestException;
import com.collab.common.exception.NotFoundException;
import com.collab.common.exception.TechnicalException;
import com.collab.task.domain.Task;
import com.collab.task.domain.TaskActivityType;
import com.collab.task.domain.TaskAttachment;
import com.collab.task.dto.TaskAttachmentResponse;
import com.collab.task.repository.TaskAttachmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

/**
 * Stores attachment binaries on the local filesystem and keeps the metadata in
 * the database. Membership checks are delegated to {@link TaskService}.
 */
@Service
public class TaskAttachmentService {

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

    private final TaskAttachmentRepository attachmentRepository;
    private final TaskService taskService;
    private final TaskActivityRecorder activityRecorder;
    private final Path attachmentsRoot;

    public TaskAttachmentService(TaskAttachmentRepository attachmentRepository,
                                 TaskService taskService,
                                 TaskActivityRecorder activityRecorder,
                                 @Value("${app.file.storage-path:./uploads}") String storagePath) {
        this.attachmentRepository = attachmentRepository;
        this.taskService = taskService;
        this.activityRecorder = activityRecorder;
        this.attachmentsRoot = Path.of(storagePath).toAbsolutePath().normalize().resolve("attachments");
    }

    @Transactional
    public TaskAttachmentResponse upload(UUID taskId, UUID actorId, MultipartFile file) {
        Task task = taskService.findTask(taskId);
        taskService.requireTaskMember(task, actorId);

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("EMPTY_FILE", "The uploaded file is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("FILE_TOO_LARGE", "The file exceeds the 10MB limit");
        }

        String fileName = sanitizeFileName(file.getOriginalFilename());
        String storedName = UUID.randomUUID() + "_" + fileName;
        Path target = attachmentsRoot.resolve(taskId.toString()).resolve(storedName);
        writeToDisk(file, target);

        TaskAttachment attachment = attachmentRepository.save(TaskAttachment.builder()
                .taskId(taskId)
                .uploaderId(actorId)
                .fileName(fileName)
                .contentType(file.getContentType())
                .sizeBytes(file.getSize())
                .storagePath(target.toString())
                .build());

        activityRecorder.record(taskId, actorId, TaskActivityType.ATTACHMENT_ADDED, fileName, null, null);
        return TaskAttachmentResponse.from(attachment);
    }

    @Transactional(readOnly = true)
    public List<TaskAttachmentResponse> list(UUID taskId, UUID actorId) {
        Task task = taskService.findTask(taskId);
        taskService.requireTaskMember(task, actorId);
        return attachmentRepository.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
                .map(TaskAttachmentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskAttachmentDownload download(UUID attachmentId, UUID actorId) {
        TaskAttachment attachment = findAttachment(attachmentId);
        Task task = taskService.findTask(attachment.getTaskId());
        taskService.requireTaskMember(task, actorId);

        Path path = Path.of(attachment.getStoragePath());
        if (!Files.exists(path)) {
            throw new NotFoundException("Attachment file", attachmentId.toString());
        }
        return new TaskAttachmentDownload(
                new PathResource(path),
                attachment.getFileName(),
                attachment.getContentType(),
                attachment.getSizeBytes());
    }

    @Transactional
    public void delete(UUID attachmentId, UUID actorId) {
        TaskAttachment attachment = findAttachment(attachmentId);
        Task task = taskService.findTask(attachment.getTaskId());
        taskService.requireTaskMember(task, actorId);

        attachmentRepository.delete(attachment);
        deleteFromDisk(attachment);
        activityRecorder.record(attachment.getTaskId(), actorId,
                TaskActivityType.ATTACHMENT_REMOVED, attachment.getFileName(), null, null);
    }

    private TaskAttachment findAttachment(UUID attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new NotFoundException("TaskAttachment", attachmentId.toString()));
    }

    private void writeToDisk(MultipartFile file, Path target) {
        try {
            Files.createDirectories(target.getParent());
            file.transferTo(target.toFile());
        } catch (IOException e) {
            throw new TechnicalException("Failed to store attachment", e);
        }
    }

    private void deleteFromDisk(TaskAttachment attachment) {
        try {
            Files.deleteIfExists(Path.of(attachment.getStoragePath()));
        } catch (IOException e) {
            // Non-fatal: the metadata is already removed; log-and-continue.
        }
    }

    private String sanitizeFileName(String original) {
        if (original == null || original.isBlank()) {
            return "file";
        }
        String name = Path.of(original).getFileName().toString().replaceAll("[^a-zA-Z0-9._-]", "_");
        return name.isBlank() ? "file" : name;
    }
}
