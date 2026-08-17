package com.collab.realtime;

import com.collab.channel.domain.Channel;
import com.collab.channel.service.ChannelAccessService;
import com.collab.project.domain.Project;
import com.collab.project.repository.ProjectRepository;
import com.collab.task.domain.Task;
import com.collab.task.repository.TaskRepository;
import com.collab.workspace.service.WorkspaceAccessService;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class RealtimeAuthorizationService {

    private final WorkspaceAccessService workspaceAccessService;
    private final ChannelAccessService channelAccessService;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;

    public RealtimeAuthorizationService(WorkspaceAccessService workspaceAccessService,
                                        ChannelAccessService channelAccessService,
                                        ProjectRepository projectRepository,
                                        TaskRepository taskRepository) {
        this.workspaceAccessService = workspaceAccessService;
        this.channelAccessService = channelAccessService;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
    }

    public boolean authorizeSubscribe(UUID userId, String destination) {
        if (destination == null) {
            return false;
        }
        if (destination.startsWith("/user/")) {
            return true;
        }
        try {
            if (destination.startsWith("/topic/workspaces/")) {
                UUID workspaceId = extractId(destination, "/topic/workspaces/");
                return workspaceId != null && workspaceAccessService.isMember(workspaceId, userId);
            }
            if (destination.startsWith("/topic/projects/")) {
                UUID projectId = extractId(destination, "/topic/projects/");
                if (projectId == null) {
                    return false;
                }
                Project project = projectRepository.findById(projectId).orElse(null);
                return project != null && workspaceAccessService.isMember(project.getWorkspaceId(), userId);
            }
            if (destination.startsWith("/topic/tasks/")) {
                UUID taskId = extractId(destination, "/topic/tasks/");
                if (taskId == null) {
                    return false;
                }
                Task task = taskRepository.findById(taskId).orElse(null);
                if (task == null) {
                    return false;
                }
                Project project = projectRepository.findById(task.getProjectId()).orElse(null);
                return project != null && workspaceAccessService.isMember(project.getWorkspaceId(), userId);
            }
            if (destination.startsWith("/topic/channels/")) {
                UUID channelId = extractId(destination, "/topic/channels/");
                if (channelId == null) {
                    return false;
                }
                Channel channel = channelAccessService.requireAccess(channelId, userId);
                return channel != null;
            }
            return false;
        } catch (RuntimeException e) {
            return false;
        }
    }

    public boolean authorizeSend(UUID userId, String destination) {
        if (destination == null) {
            return false;
        }
        if (destination.startsWith("/app/channels/") && destination.endsWith("/typing")) {
            String middle = destination.substring("/app/channels/".length(), destination.length() - "/typing".length());
            try {
                UUID channelId = UUID.fromString(middle);
                channelAccessService.requireAccess(channelId, userId);
                return true;
            } catch (RuntimeException e) {
                return false;
            }
        }
        return false;
    }

    private UUID extractId(String destination, String prefix) {
        String id = destination.substring(prefix.length());
        try {
            return UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
