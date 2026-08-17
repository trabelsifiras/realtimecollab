package com.collab.project.controller;

import com.collab.common.security.SecurityUtils;
import com.collab.project.dto.ProjectRequest;
import com.collab.project.dto.ProjectResponse;
import com.collab.project.service.ProjectService;
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
@Tag(name = "Projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping("/workspaces/{workspaceId}/projects")
    @Operation(summary = "Create a project in a workspace")
    public ResponseEntity<ProjectResponse> create(@PathVariable UUID workspaceId, @Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(projectService.create(workspaceId, SecurityUtils.currentUserId(), request));
    }

    @GetMapping("/workspaces/{workspaceId}/projects")
    @Operation(summary = "List projects in a workspace")
    public ResponseEntity<List<ProjectResponse>> list(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(projectService.list(workspaceId, SecurityUtils.currentUserId()));
    }

    @GetMapping("/projects/{id}")
    @Operation(summary = "Get a project")
    public ResponseEntity<ProjectResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(projectService.get(id, SecurityUtils.currentUserId()));
    }

    @PatchMapping("/projects/{id}")
    @Operation(summary = "Update a project")
    public ResponseEntity<ProjectResponse> update(@PathVariable UUID id, @Valid @RequestBody ProjectRequest request) {
        return ResponseEntity.ok(projectService.update(id, SecurityUtils.currentUserId(), request));
    }

    @DeleteMapping("/projects/{id}")
    @Operation(summary = "Delete a project")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        projectService.delete(id, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }
}
