package com.collab.task.controller;

import com.collab.common.api.PageResponse;
import com.collab.common.security.SecurityUtils;
import com.collab.task.domain.TaskPriority;
import com.collab.task.domain.TaskStatus;
import com.collab.task.domain.TaskType;
import com.collab.task.dto.AddTaskLabelRequest;
import com.collab.task.dto.LogTimeRequest;
import com.collab.task.dto.TaskActivityResponse;
import com.collab.task.dto.TaskLinkRequest;
import com.collab.task.dto.TaskLinkResponse;
import com.collab.task.dto.TaskRequest;
import com.collab.task.dto.TaskResponse;
import com.collab.task.dto.TaskUpdateRequest;
import com.collab.task.dto.UpdateTaskAssigneeRequest;
import com.collab.task.dto.UpdateTaskDatesRequest;
import com.collab.task.dto.UpdateTaskEpicRequest;
import com.collab.task.dto.UpdateTaskParentRequest;
import com.collab.task.dto.UpdateTaskPositionRequest;
import com.collab.task.dto.UpdateTaskStatusRequest;
import com.collab.task.dto.UpdateTaskWatcherRequest;
import com.collab.task.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Tasks")
public class TaskController {

    private static final int MAX_PAGE_SIZE = 200;

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping("/projects/{projectId}/tasks")
    @Operation(summary = "Create a task in a project")
    public ResponseEntity<TaskResponse> create(@PathVariable UUID projectId, @Valid @RequestBody TaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.create(projectId, SecurityUtils.currentUserId(), request));
    }

    @GetMapping("/projects/{projectId}/tasks")
    @Operation(summary = "List tasks in a project with filtering, pagination and sorting")
    public ResponseEntity<PageResponse<TaskResponse>> list(
            @PathVariable UUID projectId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) TaskPriority priority,
            @RequestParam(required = false) TaskType type,
            @RequestParam(required = false) UUID assigneeId,
            @RequestParam(required = false) UUID creatorId,
            @RequestParam(required = false) UUID parentId,
            @RequestParam(required = false) UUID epicId,
            @RequestParam(required = false) UUID watcherId,
            @RequestParam(required = false) List<String> labels,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dueBefore,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dueAfter,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE), parseSort(sort));
        return ResponseEntity.ok(taskService.list(projectId, SecurityUtils.currentUserId(),
                status, priority, type, assigneeId, creatorId, parentId, epicId, watcherId,
                labels, dueBefore, dueAfter, query, pageable));
    }

    @GetMapping("/tasks/{id}")
    @Operation(summary = "Get a task")
    public ResponseEntity<TaskResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.get(id, SecurityUtils.currentUserId()));
    }

    @PatchMapping("/tasks/{id}")
    @Operation(summary = "Update a task (supports optimistic locking via version)")
    public ResponseEntity<TaskResponse> update(@PathVariable UUID id, @Valid @RequestBody TaskUpdateRequest request) {
        return ResponseEntity.ok(taskService.update(id, SecurityUtils.currentUserId(), request));
    }

    @DeleteMapping("/tasks/{id}")
    @Operation(summary = "Delete a task")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        taskService.delete(id, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/tasks/{id}/status")
    @Operation(summary = "Change a task's status")
    public ResponseEntity<TaskResponse> updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateTaskStatusRequest request) {
        return ResponseEntity.ok(taskService.updateStatus(id, SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/tasks/{id}/assignee")
    @Operation(summary = "Change a task's assignee")
    public ResponseEntity<TaskResponse> updateAssignee(@PathVariable UUID id, @Valid @RequestBody UpdateTaskAssigneeRequest request) {
        return ResponseEntity.ok(taskService.updateAssignee(id, SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/tasks/{id}/position")
    @Operation(summary = "Change a task's position")
    public ResponseEntity<TaskResponse> updatePosition(@PathVariable UUID id, @Valid @RequestBody UpdateTaskPositionRequest request) {
        return ResponseEntity.ok(taskService.updatePosition(id, SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/tasks/{id}/dates")
    @Operation(summary = "Set or clear a task's start and due dates")
    public ResponseEntity<TaskResponse> updateDates(@PathVariable UUID id, @RequestBody UpdateTaskDatesRequest request) {
        return ResponseEntity.ok(taskService.updateSchedule(id, SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/tasks/{id}/parent")
    @Operation(summary = "Set or clear a task's parent (subtasks)")
    public ResponseEntity<TaskResponse> setParent(@PathVariable UUID id, @RequestBody UpdateTaskParentRequest request) {
        return ResponseEntity.ok(taskService.setParent(id, SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/tasks/{id}/epic")
    @Operation(summary = "Set or clear a task's epic link")
    public ResponseEntity<TaskResponse> setEpic(@PathVariable UUID id, @RequestBody UpdateTaskEpicRequest request) {
        return ResponseEntity.ok(taskService.setEpic(id, SecurityUtils.currentUserId(), request));
    }

    @PatchMapping("/tasks/{id}/log-time")
    @Operation(summary = "Log time spent on a task (in minutes)")
    public ResponseEntity<TaskResponse> logTime(@PathVariable UUID id, @Valid @RequestBody LogTimeRequest request) {
        return ResponseEntity.ok(taskService.logTime(id, SecurityUtils.currentUserId(), request));
    }

    @PostMapping("/tasks/{id}/labels")
    @Operation(summary = "Add a label to a task")
    public ResponseEntity<TaskResponse> addLabel(@PathVariable UUID id, @Valid @RequestBody AddTaskLabelRequest request) {
        return ResponseEntity.ok(taskService.addLabel(id, SecurityUtils.currentUserId(), request));
    }

    @DeleteMapping("/tasks/{id}/labels/{label}")
    @Operation(summary = "Remove a label from a task")
    public ResponseEntity<TaskResponse> removeLabel(@PathVariable UUID id, @PathVariable String label) {
        return ResponseEntity.ok(taskService.removeLabel(id, SecurityUtils.currentUserId(), label));
    }

    @PostMapping("/tasks/{id}/watchers")
    @Operation(summary = "Add a watcher to a task")
    public ResponseEntity<TaskResponse> addWatcher(@PathVariable UUID id, @Valid @RequestBody UpdateTaskWatcherRequest request) {
        return ResponseEntity.ok(taskService.addWatcher(id, SecurityUtils.currentUserId(), request));
    }

    @DeleteMapping("/tasks/{id}/watchers/{userId}")
    @Operation(summary = "Remove a watcher from a task")
    public ResponseEntity<TaskResponse> removeWatcher(@PathVariable UUID id, @PathVariable UUID userId) {
        return ResponseEntity.ok(taskService.removeWatcher(id, SecurityUtils.currentUserId(), userId));
    }

    @GetMapping("/tasks/{id}/subtasks")
    @Operation(summary = "List subtasks of a task")
    public ResponseEntity<List<TaskResponse>> listSubtasks(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.listSubtasks(id, SecurityUtils.currentUserId()));
    }

    @GetMapping("/tasks/{id}/activities")
    @Operation(summary = "List the activity history of a task")
    public ResponseEntity<List<TaskActivityResponse>> listActivities(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.listActivities(id, SecurityUtils.currentUserId()));
    }

    @GetMapping("/tasks/{id}/links")
    @Operation(summary = "List linked issues of a task")
    public ResponseEntity<List<TaskLinkResponse>> listLinks(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.listLinks(id, SecurityUtils.currentUserId()));
    }

    @PostMapping("/tasks/{id}/links")
    @Operation(summary = "Link this task to another task")
    public ResponseEntity<TaskLinkResponse> addLink(@PathVariable UUID id, @Valid @RequestBody TaskLinkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.addLink(id, SecurityUtils.currentUserId(), request));
    }

    @DeleteMapping("/tasks/{id}/links/{linkId}")
    @Operation(summary = "Remove a task link")
    public ResponseEntity<Void> removeLink(@PathVariable UUID id, @PathVariable UUID linkId) {
        taskService.removeLink(id, SecurityUtils.currentUserId(), linkId);
        return ResponseEntity.noContent().build();
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        String[] parts = sort.split(",");
        String property = parts[0].trim();
        Sort.Direction direction = parts.length > 1 && parts[1].trim().equalsIgnoreCase("asc")
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, property);
    }
}
