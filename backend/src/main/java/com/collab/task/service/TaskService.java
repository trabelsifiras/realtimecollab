package com.collab.task.service;

import com.collab.common.api.PageResponse;
import com.collab.common.event.DomainEvent;
import com.collab.common.exception.BadRequestException;
import com.collab.common.exception.ConflictException;
import com.collab.common.exception.NotFoundException;
import com.collab.notification.domain.NotificationType;
import com.collab.notification.service.NotificationService;
import com.collab.project.domain.Project;
import com.collab.project.repository.ProjectRepository;
import com.collab.task.domain.Task;
import com.collab.task.domain.TaskActivityType;
import com.collab.task.domain.TaskLink;
import com.collab.task.domain.TaskLinkType;
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
import com.collab.task.repository.TaskActivityRepository;
import com.collab.task.repository.TaskLinkRepository;
import com.collab.task.repository.TaskRepository;
import com.collab.workspace.service.WorkspaceAccessService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private static final int MAX_LABELS = 20;
    private static final int MAX_LABEL_LENGTH = 64;

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final TaskLinkRepository taskLinkRepository;
    private final TaskActivityRepository activityRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final NotificationService notificationService;
    private final TaskActivityRecorder activityRecorder;
    private final ApplicationEventPublisher eventPublisher;

    public TaskService(TaskRepository taskRepository,
                       ProjectRepository projectRepository,
                       TaskLinkRepository taskLinkRepository,
                       TaskActivityRepository activityRepository,
                       WorkspaceAccessService workspaceAccessService,
                       NotificationService notificationService,
                       TaskActivityRecorder activityRecorder,
                       ApplicationEventPublisher eventPublisher) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.taskLinkRepository = taskLinkRepository;
        this.activityRepository = activityRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.notificationService = notificationService;
        this.activityRecorder = activityRecorder;
        this.eventPublisher = eventPublisher;
    }

    // ------------------------------------------------------------------ create

    @Transactional
    public TaskResponse create(UUID projectId, UUID actorId, TaskRequest request) {
        Project project = requireProject(projectId);
        workspaceAccessService.requireMember(project.getWorkspaceId(), actorId);

        TaskType type = request.type() != null ? request.type() : TaskType.TASK;
        UUID parentId = validateParent(projectId, request.parentId());
        UUID epicId = validateEpic(projectId, type, request.epicId());

        Task task = Task.builder()
                .projectId(projectId)
                .key(allocateKey(project))
                .title(request.title().trim())
                .description(trimToNull(request.description()))
                .type(type)
                .status(request.status() != null ? request.status() : TaskStatus.TODO)
                .priority(request.priority() != null ? request.priority() : TaskPriority.MEDIUM)
                .assigneeId(request.assigneeId())
                .creatorId(actorId)
                .parentId(parentId)
                .epicId(epicId)
                .storyPoints(request.storyPoints())
                .startDate(request.startDate())
                .dueDate(request.dueDate())
                .originalEstimateMinutes(request.originalEstimateMinutes())
                .remainingEstimateMinutes(request.remainingEstimateMinutes())
                .loggedMinutes(0)
                .position(nextPosition(projectId))
                .build();
        task.setLabels(normalizeLabels(request.labels()));

        task = taskRepository.save(task);
        activityRecorder.record(task.getId(), actorId, TaskActivityType.CREATED);

        publishTaskEvent("TASK_CREATED", project.getWorkspaceId(), task, actorId);
        if (task.getAssigneeId() != null && !task.getAssigneeId().equals(actorId)) {
            notifyAssignee(task);
        }
        return TaskResponse.from(task);
    }

    // ------------------------------------------------------------------- list

    @Transactional(readOnly = true)
    public PageResponse<TaskResponse> list(UUID projectId, UUID actorId,
                                           TaskStatus status, TaskPriority priority, TaskType type,
                                           UUID assigneeId, UUID creatorId, UUID parentId, UUID epicId,
                                           UUID watcherId, List<String> labels,
                                           Instant dueBefore, Instant dueAfter, String query,
                                           Pageable pageable) {
        Project project = requireProject(projectId);
        workspaceAccessService.requireMember(project.getWorkspaceId(), actorId);

        Specification<Task> spec = projectScope(projectId);
        spec = and(spec, status != null, (r, cq, cb) -> cb.equal(r.get("status"), status));
        spec = and(spec, priority != null, (r, cq, cb) -> cb.equal(r.get("priority"), priority));
        spec = and(spec, type != null, (r, cq, cb) -> cb.equal(r.get("type"), type));
        spec = and(spec, assigneeId != null, (r, cq, cb) -> cb.equal(r.get("assigneeId"), assigneeId));
        spec = and(spec, creatorId != null, (r, cq, cb) -> cb.equal(r.get("creatorId"), creatorId));
        spec = and(spec, parentId != null, (r, cq, cb) -> cb.equal(r.get("parentId"), parentId));
        spec = and(spec, epicId != null, (r, cq, cb) -> cb.equal(r.get("epicId"), epicId));
        spec = and(spec, watcherId != null, (r, cq, cb) -> cb.equal(r.join("watchers"), watcherId));
        spec = and(spec, dueBefore != null, (r, cq, cb) -> cb.lessThanOrEqualTo(r.get("dueDate"), dueBefore));
        spec = and(spec, dueAfter != null, (r, cq, cb) -> cb.greaterThanOrEqualTo(r.get("dueDate"), dueAfter));

        for (String label : normalizeLabels(labels)) {
            spec = spec.and((r, cq, cb) -> cb.equal(r.join("labels"), label));
        }

        String normalizedQuery = query == null || query.isBlank() ? null : query.trim().toLowerCase();
        if (normalizedQuery != null) {
            spec = spec.and((r, cq, cb) -> cb.or(
                    cb.like(cb.lower(r.get("title")), "%" + normalizedQuery + "%"),
                    cb.like(cb.lower(r.get("key")), "%" + normalizedQuery + "%"),
                    cb.like(cb.lower(cb.coalesce(r.get("description"), "")), "%" + normalizedQuery + "%")));
        }

        Page<Task> page = taskRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(TaskResponse::from));
    }

    // ------------------------------------------------------------------- get

    @Transactional(readOnly = true)
    public TaskResponse get(UUID taskId, UUID actorId) {
        Task task = findTask(taskId);
        requireTaskMember(task, actorId);
        return TaskResponse.from(task);
    }

    // ----------------------------------------------------------------- update

    @Transactional
    public TaskResponse update(UUID taskId, UUID actorId, TaskUpdateRequest request) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);
        checkVersion(task, request.version());

        boolean changed = false;

        changed |= updateTitle(task, actorId, request.title());
        changed |= updateDescription(task, actorId, request.description());
        changed |= updateType(task, actorId, request.type());
        changed |= updateStoryPoints(task, actorId, request.storyPoints());
        changed |= updateStartDate(task, actorId, request.startDate());
        changed |= updateDueDate(task, actorId, request.dueDate());
        changed |= updateOriginalEstimate(task, actorId, request.originalEstimateMinutes());
        changed |= updateRemainingEstimate(task, actorId, request.remainingEstimateMinutes());
        if (updatePriority(task, actorId, request.priority())) {
            changed = true;
        }
        if (updateStatus(task, actorId, request.status())) {
            changed = true;
        }
        if (request.assigneeId() != null && changeAssignee(task, actorId, request.assigneeId())) {
            changed = true;
            notifyAssigneeIfNeeded(task, actorId);
        }

        if (changed) {
            task = taskRepository.saveAndFlush(task);
            publishTaskEvent("TASK_UPDATED", workspaceId, task, actorId);
        }
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse updateStatus(UUID taskId, UUID actorId, UpdateTaskStatusRequest request) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);
        checkVersion(task, request.version());

        if (updateStatus(task, actorId, request.status())) {
            task = taskRepository.saveAndFlush(task);
            publishTaskEvent("TASK_STATUS_CHANGED", workspaceId, task, actorId);
        }
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse updateAssignee(UUID taskId, UUID actorId, UpdateTaskAssigneeRequest request) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);
        checkVersion(task, request.version());

        if (changeAssignee(task, actorId, request.assigneeId())) {
            task = taskRepository.saveAndFlush(task);
            publishTaskEvent("TASK_ASSIGNED", workspaceId, task, actorId);
            notifyAssigneeIfNeeded(task, actorId);
        }
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse updatePosition(UUID taskId, UUID actorId, UpdateTaskPositionRequest request) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);
        checkVersion(task, request.version());

        task.setPosition(request.position());
        task = taskRepository.saveAndFlush(task);
        publishTaskEvent("TASK_UPDATED", workspaceId, task, actorId);
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse updateSchedule(UUID taskId, UUID actorId, UpdateTaskDatesRequest request) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);
        checkVersion(task, request.version());

        boolean changed = false;
        if (!Objects.equals(task.getStartDate(), request.startDate())) {
            activityRecorder.record(taskId, actorId, TaskActivityType.FIELD_UPDATED, "startDate",
                    str(task.getStartDate()), str(request.startDate()));
            task.setStartDate(request.startDate());
            changed = true;
        }
        if (!Objects.equals(task.getDueDate(), request.dueDate())) {
            activityRecorder.record(taskId, actorId, TaskActivityType.FIELD_UPDATED, "dueDate",
                    str(task.getDueDate()), str(request.dueDate()));
            task.setDueDate(request.dueDate());
            changed = true;
        }
        if (changed) {
            task = taskRepository.saveAndFlush(task);
            publishTaskEvent("TASK_UPDATED", workspaceId, task, actorId);
        }
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse setParent(UUID taskId, UUID actorId, UpdateTaskParentRequest request) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);
        checkVersion(task, request.version());

        UUID previous = task.getParentId();
        UUID parentId = validateParent(task.getProjectId(), request.parentId());
        if (request.parentId() != null && request.parentId().equals(taskId)) {
            throw new BadRequestException("INVALID_PARENT", "A task cannot be its own parent");
        }
        if (!Objects.equals(previous, parentId)) {
            task.setParentId(parentId);
            task = taskRepository.saveAndFlush(task);
            activityRecorder.record(taskId, actorId, TaskActivityType.FIELD_UPDATED, "parent",
                    str(previous), str(parentId));
            publishTaskEvent("TASK_UPDATED", workspaceId, task, actorId);
        }
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse setEpic(UUID taskId, UUID actorId, UpdateTaskEpicRequest request) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);
        checkVersion(task, request.version());

        UUID previous = task.getEpicId();
        UUID epicId = validateEpic(task.getProjectId(), task.getType(), request.epicId());
        if (!Objects.equals(previous, epicId)) {
            task.setEpicId(epicId);
            task = taskRepository.saveAndFlush(task);
            activityRecorder.record(taskId, actorId, TaskActivityType.FIELD_UPDATED, "epic",
                    str(previous), str(epicId));
            publishTaskEvent("TASK_UPDATED", workspaceId, task, actorId);
        }
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse logTime(UUID taskId, UUID actorId, LogTimeRequest request) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);
        checkVersion(task, request.version());

        int current = task.getLoggedMinutes() != null ? task.getLoggedMinutes() : 0;
        task.setLoggedMinutes(current + request.minutes());
        task = taskRepository.saveAndFlush(task);
        activityRecorder.record(taskId, actorId, TaskActivityType.FIELD_UPDATED, "loggedMinutes",
                String.valueOf(current), String.valueOf(task.getLoggedMinutes()));
        publishTaskEvent("TASK_UPDATED", workspaceId, task, actorId);
        return TaskResponse.from(task);
    }

    // --------------------------------------------------------- labels/watchers

    @Transactional
    public TaskResponse addLabel(UUID taskId, UUID actorId, AddTaskLabelRequest request) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);

        String label = normalizeLabel(request.label());
        if (task.getLabels().contains(label)) {
            return TaskResponse.from(task);
        }
        task.getLabels().add(label);
        task = taskRepository.saveAndFlush(task);
        activityRecorder.record(taskId, actorId, TaskActivityType.LABEL_ADDED, label, null, null);
        publishTaskEvent("TASK_UPDATED", workspaceId, task, actorId);
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse removeLabel(UUID taskId, UUID actorId, String rawLabel) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);

        String label = normalizeLabel(rawLabel);
        if (task.getLabels().remove(label)) {
            task = taskRepository.saveAndFlush(task);
            activityRecorder.record(taskId, actorId, TaskActivityType.LABEL_REMOVED, label, null, null);
            publishTaskEvent("TASK_UPDATED", workspaceId, task, actorId);
        }
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse addWatcher(UUID taskId, UUID actorId, UpdateTaskWatcherRequest request) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);

        if (task.getWatchers().add(request.userId())) {
            task = taskRepository.saveAndFlush(task);
            activityRecorder.record(taskId, actorId, TaskActivityType.WATCHER_ADDED,
                    null, null, request.userId().toString());
            publishTaskEvent("TASK_UPDATED", workspaceId, task, actorId);
        }
        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse removeWatcher(UUID taskId, UUID actorId, UUID userId) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);

        if (task.getWatchers().remove(userId)) {
            task = taskRepository.saveAndFlush(task);
            activityRecorder.record(taskId, actorId, TaskActivityType.WATCHER_REMOVED,
                    null, userId.toString(), null);
            publishTaskEvent("TASK_UPDATED", workspaceId, task, actorId);
        }
        return TaskResponse.from(task);
    }

    // ------------------------------------------------------------ sub-tasks

    @Transactional(readOnly = true)
    public List<TaskResponse> listSubtasks(UUID taskId, UUID actorId) {
        Task task = findTask(taskId);
        requireTaskMember(task, actorId);
        return taskRepository.findByParentIdOrderByPositionAsc(taskId).stream()
                .map(TaskResponse::from)
                .toList();
    }

    // ------------------------------------------------------------- activity

    @Transactional(readOnly = true)
    public List<TaskActivityResponse> listActivities(UUID taskId, UUID actorId) {
        Task task = findTask(taskId);
        requireTaskMember(task, actorId);
        return activityRepository.findByTaskIdOrderByCreatedAtDesc(taskId).stream()
                .map(TaskActivityResponse::from)
                .toList();
    }

    // ---------------------------------------------------------------- links

    @Transactional(readOnly = true)
    public List<TaskLinkResponse> listLinks(UUID taskId, UUID actorId) {
        Task task = findTask(taskId);
        requireTaskMember(task, actorId);

        List<TaskLink> links = new ArrayList<>();
        links.addAll(taskLinkRepository.findBySourceTaskIdOrderByCreatedAtAsc(taskId));
        links.addAll(taskLinkRepository.findByTargetTaskIdOrderByCreatedAtAsc(taskId));
        links.sort(Comparator.comparing(TaskLink::getCreatedAt));

        Set<UUID> otherIds = links.stream()
                .map(l -> l.getSourceTaskId().equals(taskId) ? l.getTargetTaskId() : l.getSourceTaskId())
                .collect(Collectors.toSet());
        Map<UUID, Task> others = taskRepository.findAllById(otherIds).stream()
                .collect(Collectors.toMap(Task::getId, Function.identity()));

        return links.stream()
                .map(l -> TaskLinkResponse.from(l, taskId, others.get(otherEnd(l, taskId))))
                .toList();
    }

    @Transactional
    public TaskLinkResponse addLink(UUID taskId, UUID actorId, TaskLinkRequest request) {
        Task source = findTask(taskId);
        UUID workspaceId = requireTaskMember(source, actorId);

        if (taskId.equals(request.targetTaskId())) {
            throw new BadRequestException("INVALID_LINK", "A task cannot be linked to itself");
        }
        Task target = findTask(request.targetTaskId());
        requireTaskMember(target, actorId);

        if (taskLinkRepository.existsBySourceTaskIdAndTargetTaskIdAndLinkType(
                taskId, request.targetTaskId(), request.linkType())) {
            throw new ConflictException("LINK_EXISTS", "This link already exists");
        }

        TaskLink link = taskLinkRepository.save(TaskLink.builder()
                .sourceTaskId(taskId)
                .targetTaskId(request.targetTaskId())
                .linkType(request.linkType())
                .build());

        activityRecorder.record(taskId, actorId, TaskActivityType.LINK_ADDED,
                request.linkType().name(), null, target.getKey());
        publishTaskEvent("TASK_UPDATED", workspaceId, source, actorId);
        return TaskLinkResponse.from(link, taskId, target);
    }

    @Transactional
    public void removeLink(UUID taskId, UUID actorId, UUID linkId) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);

        TaskLink link = taskLinkRepository.findById(linkId)
                .orElseThrow(() -> new NotFoundException("TaskLink", linkId.toString()));
        boolean attached = link.getSourceTaskId().equals(taskId) || link.getTargetTaskId().equals(taskId);
        if (!attached) {
            throw new NotFoundException("TaskLink", linkId.toString());
        }

        taskLinkRepository.delete(link);
        activityRecorder.record(taskId, actorId, TaskActivityType.LINK_REMOVED,
                link.getLinkType().name(), null, null);
        publishTaskEvent("TASK_UPDATED", workspaceId, task, actorId);
    }

    // -------------------------------------------------------------- delete

    @Transactional
    public void delete(UUID taskId, UUID actorId) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);
        taskRepository.delete(task);
        publishTaskEvent("TASK_DELETED", workspaceId, task, actorId);
    }

    // -------------------------------------------------------------- helpers

    public Task findTask(UUID taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task", taskId.toString()));
    }

    public UUID requireTaskMember(Task task, UUID actorId) {
        Project project = requireProject(task.getProjectId());
        workspaceAccessService.requireMember(project.getWorkspaceId(), actorId);
        return project.getWorkspaceId();
    }

    private Project requireProject(UUID projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project", projectId.toString()));
    }

    private UUID validateParent(UUID projectId, UUID parentId) {
        if (parentId == null) {
            return null;
        }
        Task parent = findTask(parentId);
        if (!parent.getProjectId().equals(projectId)) {
            throw new BadRequestException("PARENT_PROJECT_MISMATCH", "Parent task must be in the same project");
        }
        return parentId;
    }

    private UUID validateEpic(UUID projectId, TaskType type, UUID epicId) {
        if (type == TaskType.EPIC && epicId != null) {
            throw new BadRequestException("EPIC_NOT_ALLOWED", "An epic cannot belong to another epic");
        }
        if (epicId == null) {
            return null;
        }
        Task epic = findTask(epicId);
        if (epic.getType() != TaskType.EPIC) {
            throw new BadRequestException("INVALID_EPIC", "Epic link must reference an epic");
        }
        if (!epic.getProjectId().equals(projectId)) {
            throw new BadRequestException("EPIC_PROJECT_MISMATCH", "Epic must be in the same project");
        }
        return epicId;
    }

    private String allocateKey(Project project) {
        long next = taskRepository.nextKeyValue();
        return projectPrefix(project) + "-" + next;
    }

    private String projectPrefix(Project project) {
        String key = project.getKey();
        if (key == null || key.isBlank()) {
            return "PROJ";
        }
        String upper = key.trim().toUpperCase();
        return upper.length() > 16 ? upper.substring(0, 16) : upper;
    }

    private Integer nextPosition(UUID projectId) {
        Integer max = taskRepository.findMaxPosition(projectId);
        return max != null ? max + 1 : 0;
    }

    // ------------------------------ field mutators (return true when changed)

    private boolean updateTitle(Task task, UUID actorId, String title) {
        if (title == null || title.equals(task.getTitle())) {
            return false;
        }
        activityRecorder.record(task.getId(), actorId, TaskActivityType.FIELD_UPDATED,
                "title", task.getTitle(), title.trim());
        task.setTitle(title.trim());
        return true;
    }

    private boolean updateDescription(Task task, UUID actorId, String description) {
        if (description == null) {
            return false;
        }
        String value = trimToNull(description);
        if (Objects.equals(value, task.getDescription())) {
            return false;
        }
        activityRecorder.record(task.getId(), actorId, TaskActivityType.FIELD_UPDATED,
                "description", task.getDescription(), value);
        task.setDescription(value);
        return true;
    }

    private boolean updateType(Task task, UUID actorId, TaskType type) {
        if (type == null || type == task.getType()) {
            return false;
        }
        activityRecorder.record(task.getId(), actorId, TaskActivityType.FIELD_UPDATED,
                "type", task.getType().name(), type.name());
        task.setType(type);
        if (type != TaskType.SUBTASK) {
            task.setParentId(null);
        }
        if (type == TaskType.EPIC) {
            task.setEpicId(null);
        }
        return true;
    }

    private boolean updateStoryPoints(Task task, UUID actorId, Integer storyPoints) {
        if (storyPoints == null || storyPoints.equals(task.getStoryPoints())) {
            return false;
        }
        activityRecorder.record(task.getId(), actorId, TaskActivityType.FIELD_UPDATED,
                "storyPoints", str(task.getStoryPoints()), String.valueOf(storyPoints));
        task.setStoryPoints(storyPoints);
        return true;
    }

    private boolean updateStartDate(Task task, UUID actorId, Instant startDate) {
        if (startDate == null || startDate.equals(task.getStartDate())) {
            return false;
        }
        activityRecorder.record(task.getId(), actorId, TaskActivityType.FIELD_UPDATED,
                "startDate", str(task.getStartDate()), startDate.toString());
        task.setStartDate(startDate);
        return true;
    }

    private boolean updateDueDate(Task task, UUID actorId, Instant dueDate) {
        if (dueDate == null || dueDate.equals(task.getDueDate())) {
            return false;
        }
        activityRecorder.record(task.getId(), actorId, TaskActivityType.FIELD_UPDATED,
                "dueDate", str(task.getDueDate()), dueDate.toString());
        task.setDueDate(dueDate);
        return true;
    }

    private boolean updateOriginalEstimate(Task task, UUID actorId, Integer minutes) {
        if (minutes == null || minutes.equals(task.getOriginalEstimateMinutes())) {
            return false;
        }
        activityRecorder.record(task.getId(), actorId, TaskActivityType.FIELD_UPDATED,
                "originalEstimateMinutes", str(task.getOriginalEstimateMinutes()), String.valueOf(minutes));
        task.setOriginalEstimateMinutes(minutes);
        return true;
    }

    private boolean updateRemainingEstimate(Task task, UUID actorId, Integer minutes) {
        if (minutes == null || minutes.equals(task.getRemainingEstimateMinutes())) {
            return false;
        }
        activityRecorder.record(task.getId(), actorId, TaskActivityType.FIELD_UPDATED,
                "remainingEstimateMinutes", str(task.getRemainingEstimateMinutes()), String.valueOf(minutes));
        task.setRemainingEstimateMinutes(minutes);
        return true;
    }

    private boolean updateStatus(Task task, UUID actorId, TaskStatus status) {
        if (status == null || status == task.getStatus()) {
            return false;
        }
        activityRecorder.record(task.getId(), actorId, TaskActivityType.STATUS_CHANGED,
                "status", task.getStatus().name(), status.name());
        applyStatus(task, status);
        return true;
    }

    private boolean updatePriority(Task task, UUID actorId, TaskPriority priority) {
        if (priority == null || priority == task.getPriority()) {
            return false;
        }
        activityRecorder.record(task.getId(), actorId, TaskActivityType.PRIORITY_CHANGED,
                "priority", task.getPriority().name(), priority.name());
        task.setPriority(priority);
        return true;
    }

    private boolean changeAssignee(Task task, UUID actorId, UUID assigneeId) {
        if (Objects.equals(assigneeId, task.getAssigneeId())) {
            return false;
        }
        activityRecorder.record(task.getId(), actorId, TaskActivityType.ASSIGNEE_CHANGED,
                "assignee", str(task.getAssigneeId()), str(assigneeId));
        task.setAssigneeId(assigneeId);
        return true;
    }

    private void applyStatus(Task task, TaskStatus status) {
        task.setStatus(status);
        if (status == TaskStatus.DONE) {
            task.setCompletedAt(Instant.now());
        } else if (task.getCompletedAt() != null) {
            task.setCompletedAt(null);
        }
    }

    // -------------------------------------------------------- notifications

    private void notifyAssigneeIfNeeded(Task task, UUID actorId) {
        if (task.getAssigneeId() != null && !task.getAssigneeId().equals(actorId)) {
            notifyAssignee(task);
        }
    }

    private void notifyAssignee(Task task) {
        notificationService.create(
                task.getAssigneeId(),
                NotificationType.TASK_ASSIGNED,
                "Task assigned",
                "You have been assigned to " + task.getKey() + " '" + task.getTitle() + "'",
                "task",
                task.getId().toString());
    }

    // ------------------------------------------------------------- events

    private void publishTaskEvent(String type, UUID workspaceId, Task task, UUID actorId) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", task.getStatus().name());
        payload.put("priority", task.getPriority().name());
        payload.put("type", task.getType().name());
        payload.put("assigneeId", task.getAssigneeId() == null ? "" : task.getAssigneeId().toString());
        payload.put("version", task.getVersion());

        eventPublisher.publishEvent(DomainEvent.builder(type)
                .workspaceId(workspaceId)
                .projectId(task.getProjectId())
                .resourceId(task.getId())
                .actorId(actorId)
                .payload(payload)
                .build());
    }

    // ---------------------------------------------------------- spec helpers

    private Specification<Task> projectScope(UUID projectId) {
        return (root, cq, cb) -> cb.equal(root.get("projectId"), projectId);
    }

    private Specification<Task> and(Specification<Task> base, boolean condition, Specification<Task> addition) {
        return condition ? base.and(addition) : base;
    }

    // ------------------------------------------------------ value normalizers

    private Set<String> normalizeLabels(List<String> labels) {
        Set<String> unique = new LinkedHashSet<>();
        if (labels == null || labels.isEmpty()) {
            return unique;
        }
        for (String raw : labels) {
            String normalized = normalizeLabel(raw);
            if (normalized != null) {
                unique.add(normalized);
                if (unique.size() >= MAX_LABELS) {
                    break;
                }
            }
        }
        return unique;
    }

    private String normalizeLabel(String raw) {
        if (raw == null) {
            return null;
        }
        String value = raw.trim().toLowerCase().replace(' ', '-');
        if (value.isEmpty()) {
            return null;
        }
        return value.length() > MAX_LABEL_LENGTH ? value.substring(0, MAX_LABEL_LENGTH) : value;
    }

    private void checkVersion(Task task, Long expectedVersion) {
        if (expectedVersion != null && !expectedVersion.equals(task.getVersion())) {
            throw new ConflictException("RESOURCE_VERSION_CONFLICT",
                    "The task was modified by another user.", task.getId().toString());
        }
    }

    private UUID otherEnd(TaskLink link, UUID taskId) {
        return link.getSourceTaskId().equals(taskId) ? link.getTargetTaskId() : link.getSourceTaskId();
    }

    private String str(Object value) {
        return value == null ? null : value.toString();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
