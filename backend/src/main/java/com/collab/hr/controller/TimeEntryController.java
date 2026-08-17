package com.collab.hr.controller;

import com.collab.common.security.SecurityUtils;
import com.collab.hr.domain.TimeEntryStatus;
import com.collab.hr.dto.ReviewTimeEntryRequest;
import com.collab.hr.dto.TimeEntryRequest;
import com.collab.hr.dto.TimeEntryResponse;
import com.collab.hr.service.TimeEntryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Time Entries")
public class TimeEntryController {

    private final TimeEntryService timeEntryService;

    public TimeEntryController(TimeEntryService timeEntryService) {
        this.timeEntryService = timeEntryService;
    }

    @PostMapping("/workspaces/{workspaceId}/time-entries")
    @Operation(summary = "Log working hours")
    public ResponseEntity<TimeEntryResponse> create(@PathVariable UUID workspaceId,
                                                    @Valid @RequestBody TimeEntryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(timeEntryService.create(workspaceId, SecurityUtils.currentUserId(), request));
    }

    @GetMapping("/workspaces/{workspaceId}/time-entries")
    @Operation(summary = "List my time entries")
    public ResponseEntity<List<TimeEntryResponse>> listMine(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) UUID taskId,
            @RequestParam(required = false) TimeEntryStatus status) {
        return ResponseEntity.ok(timeEntryService.listMine(
                workspaceId, SecurityUtils.currentUserId(), from, to, projectId, taskId, status));
    }

    @PatchMapping("/time-entries/{id}")
    @Operation(summary = "Update a draft time entry")
    public ResponseEntity<TimeEntryResponse> update(@PathVariable UUID id,
                                                    @Valid @RequestBody TimeEntryRequest request) {
        return ResponseEntity.ok(timeEntryService.update(id, SecurityUtils.currentUserId(), request));
    }

    @DeleteMapping("/time-entries/{id}")
    @Operation(summary = "Delete a draft time entry")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        timeEntryService.delete(id, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/time-entries/{id}/submit")
    @Operation(summary = "Submit a draft time entry for approval")
    public ResponseEntity<TimeEntryResponse> submit(@PathVariable UUID id) {
        return ResponseEntity.ok(timeEntryService.submit(id, SecurityUtils.currentUserId()));
    }

    @GetMapping("/workspaces/{workspaceId}/time-entries/team")
    @Operation(summary = "List all time entries in the workspace (HR only)")
    public ResponseEntity<List<TimeEntryResponse>> listTeam(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) UUID taskId,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) TimeEntryStatus status) {
        return ResponseEntity.ok(timeEntryService.listTeam(
                workspaceId, SecurityUtils.currentUserId(), from, to, projectId, taskId, userId, status));
    }

    @PatchMapping("/time-entries/{id}/review")
    @Operation(summary = "Approve or reject a time entry (HR only)")
    public ResponseEntity<TimeEntryResponse> review(@PathVariable UUID id,
                                                    @Valid @RequestBody ReviewTimeEntryRequest request) {
        return ResponseEntity.ok(timeEntryService.review(id, SecurityUtils.currentUserId(), request));
    }
}
