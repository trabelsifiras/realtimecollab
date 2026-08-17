package com.collab.workspace.controller;

import com.collab.common.security.SecurityUtils;
import com.collab.workspace.dto.AddMemberRequest;
import com.collab.workspace.dto.UpdateMemberRoleRequest;
import com.collab.workspace.dto.WorkspaceMemberResponse;
import com.collab.workspace.dto.WorkspaceRequest;
import com.collab.workspace.dto.WorkspaceResponse;
import com.collab.workspace.service.WorkspaceService;
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
@RequestMapping("/api/v1/workspaces")
@Tag(name = "Workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    public WorkspaceController(WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @PostMapping
    @Operation(summary = "Create a workspace")
    public ResponseEntity<WorkspaceResponse> create(@Valid @RequestBody WorkspaceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workspaceService.create(SecurityUtils.currentUserId(), request));
    }

    @GetMapping
    @Operation(summary = "List workspaces the current user belongs to")
    public ResponseEntity<List<WorkspaceResponse>> list() {
        return ResponseEntity.ok(workspaceService.list(SecurityUtils.currentUserId()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a workspace")
    public ResponseEntity<WorkspaceResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(workspaceService.get(id, SecurityUtils.currentUserId()));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update a workspace")
    public ResponseEntity<WorkspaceResponse> update(@PathVariable UUID id, @Valid @RequestBody WorkspaceRequest request) {
        return ResponseEntity.ok(workspaceService.update(id, SecurityUtils.currentUserId(), request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a workspace")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        workspaceService.delete(id, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/members")
    @Operation(summary = "Add a member to a workspace")
    public ResponseEntity<WorkspaceMemberResponse> addMember(@PathVariable UUID id, @Valid @RequestBody AddMemberRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(workspaceService.addMember(id, SecurityUtils.currentUserId(), request));
    }

    @GetMapping("/{id}/members")
    @Operation(summary = "List workspace members")
    public ResponseEntity<List<WorkspaceMemberResponse>> listMembers(@PathVariable UUID id) {
        return ResponseEntity.ok(workspaceService.listMembers(id, SecurityUtils.currentUserId()));
    }

    @PatchMapping("/{id}/members/{userId}")
    @Operation(summary = "Update a member's role")
    public ResponseEntity<WorkspaceMemberResponse> updateMemberRole(
            @PathVariable UUID id, @PathVariable UUID userId, @Valid @RequestBody UpdateMemberRoleRequest request) {
        return ResponseEntity.ok(workspaceService.updateMemberRole(id, SecurityUtils.currentUserId(), userId, request));
    }

    @DeleteMapping("/{id}/members/{userId}")
    @Operation(summary = "Remove a member from a workspace")
    public ResponseEntity<Void> removeMember(@PathVariable UUID id, @PathVariable UUID userId) {
        workspaceService.removeMember(id, SecurityUtils.currentUserId(), userId);
        return ResponseEntity.noContent().build();
    }
}
