package com.collab.project.service;

import com.collab.common.event.DomainEvent;
import com.collab.common.exception.NotFoundException;
import com.collab.project.domain.Project;
import com.collab.project.domain.ProjectStatus;
import com.collab.project.dto.ProjectRequest;
import com.collab.project.dto.ProjectResponse;
import com.collab.project.repository.ProjectRepository;
import com.collab.workspace.service.WorkspaceAccessService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final ApplicationEventPublisher eventPublisher;

    public ProjectService(ProjectRepository projectRepository,
                          WorkspaceAccessService workspaceAccessService,
                          ApplicationEventPublisher eventPublisher) {
        this.projectRepository = projectRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public ProjectResponse create(UUID workspaceId, UUID actorId, ProjectRequest request) {
        workspaceAccessService.requireMember(workspaceId, actorId);

        Project project = Project.builder()
                .workspaceId(workspaceId)
                .name(request.name().trim())
                .description(trimToNull(request.description()))
                .key(trimToNull(request.key()))
                .status(request.status() != null ? request.status() : ProjectStatus.ACTIVE)
                .ownerId(actorId)
                .build();
        project = projectRepository.save(project);

        publishProjectEvent("PROJECT_UPDATED", project, actorId);
        return ProjectResponse.from(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> list(UUID workspaceId, UUID actorId) {
        workspaceAccessService.requireMember(workspaceId, actorId);
        return projectRepository.findAllByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream()
                .map(ProjectResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(UUID projectId, UUID actorId) {
        Project project = findProject(projectId);
        workspaceAccessService.requireMember(project.getWorkspaceId(), actorId);
        return ProjectResponse.from(project);
    }

    @Transactional
    public ProjectResponse update(UUID projectId, UUID actorId, ProjectRequest request) {
        Project project = findProject(projectId);
        workspaceAccessService.requireAdmin(project.getWorkspaceId(), actorId);

        project.setName(request.name().trim());
        project.setDescription(trimToNull(request.description()));
        if (request.key() != null) {
            project.setKey(trimToNull(request.key()));
        }
        if (request.status() != null) {
            project.setStatus(request.status());
        }
        project = projectRepository.save(project);

        publishProjectEvent("PROJECT_UPDATED", project, actorId);
        return ProjectResponse.from(project);
    }

    @Transactional
    public void delete(UUID projectId, UUID actorId) {
        Project project = findProject(projectId);
        workspaceAccessService.requireAdmin(project.getWorkspaceId(), actorId);
        projectRepository.deleteById(projectId);
    }

    public Project findProject(UUID projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project", projectId.toString()));
    }

    private void publishProjectEvent(String type, Project project, UUID actorId) {
        eventPublisher.publishEvent(DomainEvent.builder(type)
                .workspaceId(project.getWorkspaceId())
                .projectId(project.getId())
                .resourceId(project.getId())
                .actorId(actorId)
                .payload(Map.of("name", project.getName(), "status", project.getStatus().name()))
                .build());
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
