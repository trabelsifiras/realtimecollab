package com.collab.task.service;

import com.collab.common.exception.BadRequestException;
import com.collab.common.exception.ConflictException;
import com.collab.common.exception.ForbiddenException;
import com.collab.notification.service.NotificationService;
import com.collab.project.domain.Project;
import com.collab.project.repository.ProjectRepository;
import com.collab.task.domain.Task;
import com.collab.task.domain.TaskLinkType;
import com.collab.task.domain.TaskPriority;
import com.collab.task.domain.TaskStatus;
import com.collab.task.domain.TaskType;
import com.collab.task.dto.AddTaskLabelRequest;
import com.collab.task.dto.TaskLinkRequest;
import com.collab.task.dto.TaskRequest;
import com.collab.task.dto.UpdateTaskStatusRequest;
import com.collab.task.repository.TaskActivityRepository;
import com.collab.task.repository.TaskLinkRepository;
import com.collab.task.repository.TaskRepository;
import com.collab.workspace.service.WorkspaceAccessService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private TaskLinkRepository taskLinkRepository;
    @Mock
    private TaskActivityRepository activityRepository;
    @Mock
    private WorkspaceAccessService workspaceAccessService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private TaskActivityRecorder activityRecorder;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private TaskService taskService;

    private final UUID projectId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();
    private final UUID taskId = UUID.randomUUID();

    @Test
    void createTaskRequiresWorkspaceMembership() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project("PRJ")));
        doThrow(new ForbiddenException("not a member"))
                .when(workspaceAccessService).requireMember(workspaceId, actorId);

        assertThatThrownBy(() -> taskService.create(projectId, actorId, request("My task")))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void createTaskAssignsInitialPositionAndKey() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project("PRJ")));
        when(taskRepository.findMaxPosition(projectId)).thenReturn(4);
        when(taskRepository.nextKeyValue()).thenReturn(1L);
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = taskService.create(projectId, actorId, request("My task"));

        assertThat(response.position()).isEqualTo(5);
        assertThat(response.creatorId()).isEqualTo(actorId);
        assertThat(response.status()).isEqualTo(TaskStatus.TODO);
        assertThat(response.type()).isEqualTo(TaskType.TASK);
        assertThat(response.key()).isEqualTo("PRJ-1");
    }

    @Test
    void updateStatusWithStaleVersionThrowsConflict() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task()));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project("PRJ")));

        assertThatThrownBy(() -> taskService.updateStatus(taskId, actorId,
                new UpdateTaskStatusRequest(TaskStatus.DONE, 4L)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("modified by another user");
        verify(taskRepository, never()).saveAndFlush(any(Task.class));
    }

    @Test
    void updateStatusWithMatchingVersionSucceeds() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task()));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project("PRJ")));
        when(taskRepository.saveAndFlush(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = taskService.updateStatus(taskId, actorId,
                new UpdateTaskStatusRequest(TaskStatus.DONE, 5L));

        assertThat(response.status()).isEqualTo(TaskStatus.DONE);
        assertThat(response.completedAt()).isNotNull();
    }

    @Test
    void addLinkToSelfIsRejected() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task()));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project("PRJ")));

        assertThatThrownBy(() -> taskService.addLink(taskId, actorId,
                new TaskLinkRequest(TaskLinkType.BLOCKS, taskId)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void addLabelNormalizesAndDeduplicates() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task()));
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project("PRJ")));
        when(taskRepository.saveAndFlush(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = taskService.addLabel(taskId, actorId, new AddTaskLabelRequest("  My Label  "));

        assertThat(response.labels()).containsExactly("my-label");
    }

    private Task task() {
        Task task = Task.builder()
                .projectId(projectId)
                .key("PRJ-1")
                .title("Task")
                .creatorId(actorId)
                .build();
        task.setVersion(5L);
        task.setId(taskId);
        return task;
    }

    private Project project(String key) {
        Project project = new Project();
        project.setId(projectId);
        project.setWorkspaceId(workspaceId);
        project.setKey(key);
        return project;
    }

    private TaskRequest request(String title) {
        return new TaskRequest(title, null, null, TaskPriority.HIGH, null, null,
                null, null, null, null, null, null, null, null);
    }
}
