package com.collab.admin.controller;

import com.collab.admin.dto.AdminUpdateUserRequest;
import com.collab.admin.service.AdminService;
import com.collab.common.api.PageResponse;
import com.collab.user.dto.UserResponse;
import com.collab.workspace.dto.UpdateMemberRoleRequest;
import com.collab.workspace.dto.WorkspaceMemberResponse;
import com.collab.workspace.dto.WorkspaceResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Backoffice")
public class AdminController {

    private static final int MAX_PAGE_SIZE = 200;

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    @Operation(summary = "List all users (root admin only)")
    public ResponseEntity<PageResponse<UserResponse>> listUsers(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, MAX_PAGE_SIZE));
        return ResponseEntity.ok(adminService.listUsers(query, pageable));
    }

    @PatchMapping("/users/{id}")
    @Operation(summary = "Update a user's role or active status (root admin only)")
    public ResponseEntity<UserResponse> updateUser(@PathVariable UUID id,
                                                   @Valid @RequestBody AdminUpdateUserRequest request) {
        return ResponseEntity.ok(adminService.updateUser(id, request));
    }

    @GetMapping("/workspaces")
    @Operation(summary = "List all workspaces (root admin only)")
    public ResponseEntity<List<WorkspaceResponse>> listWorkspaces() {
        return ResponseEntity.ok(adminService.listWorkspaces());
    }

    @GetMapping("/workspaces/{workspaceId}/members")
    @Operation(summary = "List members of a workspace (root admin only)")
    public ResponseEntity<List<WorkspaceMemberResponse>> listMembers(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(adminService.listMembers(workspaceId));
    }

    @PatchMapping("/workspaces/{workspaceId}/members/{userId}")
    @Operation(summary = "Assign a member's role (root admin only)")
    public ResponseEntity<WorkspaceMemberResponse> assignRole(@PathVariable UUID workspaceId,
                                                              @PathVariable UUID userId,
                                                              @Valid @RequestBody UpdateMemberRoleRequest request) {
        return ResponseEntity.ok(adminService.assignRole(workspaceId, userId, request));
    }

    @DeleteMapping("/workspaces/{workspaceId}/members/{userId}")
    @Operation(summary = "Remove a member from a workspace (root admin only)")
    public ResponseEntity<Void> removeMember(@PathVariable UUID workspaceId, @PathVariable UUID userId) {
        adminService.removeMember(workspaceId, userId);
        return ResponseEntity.noContent().build();
    }
}
