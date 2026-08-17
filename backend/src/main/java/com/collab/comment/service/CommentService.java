package com.collab.comment.service;

import com.collab.common.event.DomainEvent;
import com.collab.common.exception.ForbiddenException;
import com.collab.common.exception.NotFoundException;
import com.collab.comment.domain.Comment;
import com.collab.comment.dto.CommentRequest;
import com.collab.comment.dto.CommentResponse;
import com.collab.comment.repository.CommentRepository;
import com.collab.project.domain.Project;
import com.collab.project.repository.ProjectRepository;
import com.collab.task.domain.Task;
import com.collab.task.repository.TaskRepository;
import com.collab.workspace.service.WorkspaceAccessService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final ApplicationEventPublisher eventPublisher;

    public CommentService(CommentRepository commentRepository,
                          TaskRepository taskRepository,
                          ProjectRepository projectRepository,
                          WorkspaceAccessService workspaceAccessService,
                          ApplicationEventPublisher eventPublisher) {
        this.commentRepository = commentRepository;
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public CommentResponse create(UUID taskId, UUID actorId, CommentRequest request) {
        Task task = findTask(taskId);
        UUID workspaceId = requireTaskMember(task, actorId);

        Comment comment = Comment.builder()
                .taskId(taskId)
                .authorId(actorId)
                .content(request.content().trim())
                .build();
        comment = commentRepository.save(comment);

        publishCommentEvent("COMMENT_CREATED", workspaceId, task, comment, actorId);
        return CommentResponse.from(comment);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> list(UUID taskId, UUID actorId) {
        Task task = findTask(taskId);
        requireTaskMember(task, actorId);
        return commentRepository.findByTaskIdAndDeletedAtIsNullOrderByCreatedAtAsc(taskId).stream()
                .map(CommentResponse::from)
                .toList();
    }

    @Transactional
    public CommentResponse update(UUID commentId, UUID actorId, CommentRequest request) {
        Comment comment = findComment(commentId);
        if (!comment.getAuthorId().equals(actorId)) {
            throw new ForbiddenException("Only the author can edit this comment");
        }
        Task task = findTask(comment.getTaskId());
        UUID workspaceId = requireTaskMember(task, actorId);

        comment.setContent(request.content().trim());
        comment = commentRepository.save(comment);

        publishCommentEvent("COMMENT_UPDATED", workspaceId, task, comment, actorId);
        return CommentResponse.from(comment);
    }

    @Transactional
    public void delete(UUID commentId, UUID actorId) {
        Comment comment = findComment(commentId);
        if (!comment.getAuthorId().equals(actorId)) {
            throw new ForbiddenException("Only the author can delete this comment");
        }
        Task task = findTask(comment.getTaskId());
        UUID workspaceId = requireTaskMember(task, actorId);

        comment.setDeletedAt(Instant.now());
        commentRepository.save(comment);

        publishCommentEvent("COMMENT_DELETED", workspaceId, task, comment, actorId);
    }

    private Comment findComment(UUID commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Comment", commentId.toString()));
    }

    private Task findTask(UUID taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task", taskId.toString()));
    }

    private UUID requireTaskMember(Task task, UUID actorId) {
        Project project = projectRepository.findById(task.getProjectId())
                .orElseThrow(() -> new NotFoundException("Project", task.getProjectId().toString()));
        workspaceAccessService.requireMember(project.getWorkspaceId(), actorId);
        return project.getWorkspaceId();
    }

    private void publishCommentEvent(String type, UUID workspaceId, Task task, Comment comment, UUID actorId) {
        eventPublisher.publishEvent(DomainEvent.builder(type)
                .workspaceId(workspaceId)
                .projectId(task.getProjectId())
                .resourceId(task.getId())
                .actorId(actorId)
                .payload(Map.of("commentId", comment.getId().toString()))
                .build());
    }
}
