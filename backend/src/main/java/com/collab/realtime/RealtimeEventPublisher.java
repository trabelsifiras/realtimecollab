package com.collab.realtime;

import com.collab.common.event.DomainEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.UUID;

@Component
public class RealtimeEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(RealtimeEventPublisher.class);

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeEventPublisher(@Lazy SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onDomainEvent(DomainEvent event) {
        publish(event);
    }

    public void publish(DomainEvent event) {
        RealtimeEvent envelope = new RealtimeEvent(
                UUID.randomUUID(),
                event.type(),
                Instant.now(),
                event.workspaceId(),
                event.projectId(),
                event.resourceId(),
                event.actorId(),
                event.payload());

        if (event.recipientId() != null) {
            messagingTemplate.convertAndSendToUser(
                    event.recipientId().toString(), "/queue/notifications", envelope);
        }

        if (event.workspaceId() != null) {
            messagingTemplate.convertAndSend("/topic/workspaces/" + event.workspaceId(), envelope);
        }

        if (event.projectId() != null) {
            messagingTemplate.convertAndSend("/topic/projects/" + event.projectId(), envelope);
        }

        if (isTaskScoped(event.type()) && event.resourceId() != null) {
            messagingTemplate.convertAndSend("/topic/tasks/" + event.resourceId(), envelope);
        }

        if (isMessageScoped(event.type()) && event.resourceId() != null) {
            messagingTemplate.convertAndSend("/topic/channels/" + event.resourceId(), envelope);
        }

        log.debug("Published realtime event type={} workspace={} project={} resource={}",
                event.type(), event.workspaceId(), event.projectId(), event.resourceId());
    }

    private boolean isTaskScoped(String type) {
        return type.startsWith("TASK_") || type.startsWith("COMMENT_");
    }

    private boolean isMessageScoped(String type) {
        return type.startsWith("MESSAGE_") || type.startsWith("TYPING_");
    }
}
