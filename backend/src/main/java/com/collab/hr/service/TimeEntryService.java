package com.collab.hr.service;

import com.collab.common.exception.BadRequestException;
import com.collab.common.exception.NotFoundException;
import com.collab.hr.domain.TimeEntry;
import com.collab.hr.domain.TimeEntryStatus;
import com.collab.hr.dto.ReviewTimeEntryRequest;
import com.collab.hr.dto.TimeEntryRequest;
import com.collab.hr.dto.TimeEntryResponse;
import com.collab.hr.repository.TimeEntryRepository;
import com.collab.project.domain.Project;
import com.collab.project.repository.ProjectRepository;
import com.collab.task.domain.Task;
import com.collab.task.repository.TaskRepository;
import com.collab.workspace.service.WorkspaceAccessService;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TimeEntryService {

    private final TimeEntryRepository timeEntryRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final WorkspaceAccessService workspaceAccessService;

    public TimeEntryService(TimeEntryRepository timeEntryRepository,
                            ProjectRepository projectRepository,
                            TaskRepository taskRepository,
                            WorkspaceAccessService workspaceAccessService) {
        this.timeEntryRepository = timeEntryRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.workspaceAccessService = workspaceAccessService;
    }

    @Transactional
    public TimeEntryResponse create(UUID workspaceId, UUID actorId, TimeEntryRequest request) {
        workspaceAccessService.requireMember(workspaceId, actorId);
        Project project = requireProjectInWorkspace(request.projectId(), workspaceId);
        Task task = requireTaskInProject(request.taskId(), request.projectId());

        TimeEntry entry = timeEntryRepository.save(TimeEntry.builder()
                .workspaceId(workspaceId)
                .userId(actorId)
                .projectId(request.projectId())
                .taskId(request.taskId())
                .entryDate(request.entryDate())
                .durationMinutes(request.durationMinutes())
                .description(trimToNull(request.description()))
                .status(TimeEntryStatus.DRAFT)
                .build());

        return TimeEntryResponse.from(entry, project, task);
    }

    @Transactional(readOnly = true)
    public List<TimeEntryResponse> listMine(UUID workspaceId, UUID actorId,
                                            LocalDate from, LocalDate to,
                                            UUID projectId, UUID taskId, TimeEntryStatus status) {
        workspaceAccessService.requireMember(workspaceId, actorId);
        Specification<TimeEntry> spec = buildSpec(workspaceId, actorId, from, to, projectId, taskId, status);
        return toResponses(timeEntryRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "entryDate")));
    }

    @Transactional
    public TimeEntryResponse update(UUID entryId, UUID actorId, TimeEntryRequest request) {
        TimeEntry entry = requireOwnDraft(entryId, actorId);
        Project project = requireProjectInWorkspace(request.projectId(), entry.getWorkspaceId());
        Task task = requireTaskInProject(request.taskId(), request.projectId());

        entry.setProjectId(request.projectId());
        entry.setTaskId(request.taskId());
        entry.setEntryDate(request.entryDate());
        entry.setDurationMinutes(request.durationMinutes());
        entry.setDescription(trimToNull(request.description()));

        return TimeEntryResponse.from(timeEntryRepository.save(entry), project, task);
    }

    @Transactional
    public void delete(UUID entryId, UUID actorId) {
        TimeEntry entry = requireOwnDraft(entryId, actorId);
        timeEntryRepository.delete(entry);
    }

    @Transactional
    public TimeEntryResponse submit(UUID entryId, UUID actorId) {
        TimeEntry entry = requireOwnDraft(entryId, actorId);
        entry.setStatus(TimeEntryStatus.SUBMITTED);
        entry.setSubmittedAt(Instant.now());
        return TimeEntryResponse.from(timeEntryRepository.save(entry), projectFor(entry), taskFor(entry));
    }

    @Transactional(readOnly = true)
    public List<TimeEntryResponse> listTeam(UUID workspaceId, UUID actorId,
                                            LocalDate from, LocalDate to,
                                            UUID projectId, UUID taskId, UUID userId, TimeEntryStatus status) {
        workspaceAccessService.requireHr(workspaceId, actorId);
        Specification<TimeEntry> spec = buildSpec(workspaceId, userId, from, to, projectId, taskId, status);
        return toResponses(timeEntryRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "entryDate")));
    }

    @Transactional
    public TimeEntryResponse review(UUID entryId, UUID actorId, ReviewTimeEntryRequest request) {
        TimeEntry entry = find(entryId);
        workspaceAccessService.requireHr(entry.getWorkspaceId(), actorId);

        if (entry.getStatus() != TimeEntryStatus.SUBMITTED) {
            throw new BadRequestException("NOT_SUBMITTED", "Only submitted entries can be reviewed");
        }
        if (request.status() != TimeEntryStatus.APPROVED && request.status() != TimeEntryStatus.REJECTED) {
            throw new BadRequestException("INVALID_REVIEW_STATUS", "Review status must be APPROVED or REJECTED");
        }

        entry.setStatus(request.status());
        entry.setReviewedBy(actorId);
        entry.setReviewedAt(Instant.now());
        entry.setRejectionReason(request.status() == TimeEntryStatus.REJECTED
                ? trimToNull(request.rejectionReason()) : null);

        return TimeEntryResponse.from(timeEntryRepository.save(entry), projectFor(entry), taskFor(entry));
    }

    // ------------------------------------------------------------- helpers

    private TimeEntry requireOwnDraft(UUID entryId, UUID actorId) {
        TimeEntry entry = find(entryId);
        workspaceAccessService.requireMember(entry.getWorkspaceId(), actorId);
        if (!entry.getUserId().equals(actorId)) {
            throw new NotFoundException("TimeEntry", entryId.toString());
        }
        if (entry.getStatus() != TimeEntryStatus.DRAFT) {
            throw new BadRequestException("NOT_EDITABLE", "Only draft entries can be edited");
        }
        return entry;
    }

    private TimeEntry find(UUID entryId) {
        return timeEntryRepository.findById(entryId)
                .orElseThrow(() -> new NotFoundException("TimeEntry", entryId.toString()));
    }

    private Project requireProjectInWorkspace(UUID projectId, UUID workspaceId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project", projectId.toString()));
        if (!project.getWorkspaceId().equals(workspaceId)) {
            throw new BadRequestException("PROJECT_WORKSPACE_MISMATCH", "Project does not belong to this workspace");
        }
        return project;
    }

    private Task requireTaskInProject(UUID taskId, UUID projectId) {
        if (taskId == null) {
            return null;
        }
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task", taskId.toString()));
        if (!task.getProjectId().equals(projectId)) {
            throw new BadRequestException("TASK_PROJECT_MISMATCH", "Task does not belong to the selected project");
        }
        return task;
    }

    private Project projectFor(TimeEntry entry) {
        if (entry.getProjectId() == null) {
            return null;
        }
        return projectRepository.findById(entry.getProjectId()).orElse(null);
    }

    private Task taskFor(TimeEntry entry) {
        if (entry.getTaskId() == null) {
            return null;
        }
        return taskRepository.findById(entry.getTaskId()).orElse(null);
    }

    private List<TimeEntryResponse> toResponses(List<TimeEntry> entries) {
        Set<UUID> projectIds = entries.stream()
                .map(TimeEntry::getProjectId).filter(Objects::nonNull).collect(Collectors.toSet());
        Set<UUID> taskIds = entries.stream()
                .map(TimeEntry::getTaskId).filter(Objects::nonNull).collect(Collectors.toSet());

        Map<UUID, Project> projects = projectIds.isEmpty()
                ? Map.of()
                : projectRepository.findAllById(projectIds).stream()
                        .collect(Collectors.toMap(Project::getId, Function.identity()));
        Map<UUID, Task> tasks = taskIds.isEmpty()
                ? Map.of()
                : taskRepository.findAllById(taskIds).stream()
                        .collect(Collectors.toMap(Task::getId, Function.identity()));

        return entries.stream()
                .map(e -> TimeEntryResponse.from(e, projects.get(e.getProjectId()), tasks.get(e.getTaskId())))
                .toList();
    }

    private Specification<TimeEntry> buildSpec(UUID workspaceId, UUID userId,
                                               LocalDate from, LocalDate to,
                                               UUID projectId, UUID taskId, TimeEntryStatus status) {
        Specification<TimeEntry> spec = (root, cq, cb) -> cb.equal(root.get("workspaceId"), workspaceId);
        if (userId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("userId"), userId));
        }
        if (from != null) {
            spec = spec.and((root, cq, cb) -> cb.greaterThanOrEqualTo(root.get("entryDate"), from));
        }
        if (to != null) {
            spec = spec.and((root, cq, cb) -> cb.lessThanOrEqualTo(root.get("entryDate"), to));
        }
        if (projectId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("projectId"), projectId));
        }
        if (taskId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("taskId"), taskId));
        }
        if (status != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("status"), status));
        }
        return spec;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
