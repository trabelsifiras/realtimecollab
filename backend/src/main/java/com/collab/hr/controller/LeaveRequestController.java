package com.collab.hr.controller;

import com.collab.common.security.SecurityUtils;
import com.collab.hr.domain.LeaveStatus;
import com.collab.hr.dto.LeaveRequestRequest;
import com.collab.hr.dto.LeaveRequestResponse;
import com.collab.hr.dto.ReviewLeaveRequestRequest;
import com.collab.hr.service.LeaveRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@Tag(name = "Leave Requests")
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;

    public LeaveRequestController(LeaveRequestService leaveRequestService) {
        this.leaveRequestService = leaveRequestService;
    }

    @PostMapping("/workspaces/{workspaceId}/leave-requests")
    @Operation(summary = "Request time off")
    public ResponseEntity<LeaveRequestResponse> create(@PathVariable UUID workspaceId,
                                                       @Valid @RequestBody LeaveRequestRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(leaveRequestService.create(workspaceId, SecurityUtils.currentUserId(), request));
    }

    @GetMapping("/workspaces/{workspaceId}/leave-requests")
    @Operation(summary = "List my leave requests")
    public ResponseEntity<List<LeaveRequestResponse>> listMine(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) LeaveStatus status) {
        return ResponseEntity.ok(leaveRequestService.listMine(workspaceId, SecurityUtils.currentUserId(), status));
    }

    @PatchMapping("/leave-requests/{id}/cancel")
    @Operation(summary = "Cancel my leave request")
    public ResponseEntity<LeaveRequestResponse> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(leaveRequestService.cancel(id, SecurityUtils.currentUserId()));
    }

    @GetMapping("/workspaces/{workspaceId}/leave-requests/team")
    @Operation(summary = "List all leave requests in the workspace (HR only)")
    public ResponseEntity<List<LeaveRequestResponse>> listTeam(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) LeaveStatus status,
            @RequestParam(required = false) UUID userId) {
        return ResponseEntity.ok(leaveRequestService.listTeam(workspaceId, SecurityUtils.currentUserId(), status, userId));
    }

    @PatchMapping("/leave-requests/{id}/review")
    @Operation(summary = "Approve or reject a leave request (HR only)")
    public ResponseEntity<LeaveRequestResponse> review(@PathVariable UUID id,
                                                       @Valid @RequestBody ReviewLeaveRequestRequest request) {
        return ResponseEntity.ok(leaveRequestService.review(id, SecurityUtils.currentUserId(), request));
    }
}
