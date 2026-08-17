package com.collab.notification.service;

import com.collab.common.api.PageResponse;
import com.collab.common.event.DomainEvent;
import com.collab.common.exception.ForbiddenException;
import com.collab.common.exception.NotFoundException;
import com.collab.notification.domain.Notification;
import com.collab.notification.domain.NotificationType;
import com.collab.notification.dto.NotificationResponse;
import com.collab.notification.repository.NotificationRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ApplicationEventPublisher eventPublisher;

    public NotificationService(NotificationRepository notificationRepository,
                               ApplicationEventPublisher eventPublisher) {
        this.notificationRepository = notificationRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Notification create(UUID recipientId, NotificationType type, String title, String message,
                               String resourceType, String resourceId) {
        Notification notification = Notification.builder()
                .recipientId(recipientId)
                .type(type)
                .title(title)
                .message(message)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .read(false)
                .createdAt(Instant.now())
                .build();
        notification = notificationRepository.save(notification);

        eventPublisher.publishEvent(DomainEvent.builder("NOTIFICATION_CREATED")
                .recipientId(recipientId)
                .resourceId(notification.getId())
                .payload(Map.of(
                        "type", type.name(),
                        "title", title == null ? "" : title,
                        "message", message == null ? "" : message,
                        "resourceType", resourceType == null ? "" : resourceType,
                        "resourceId", resourceId == null ? "" : resourceId))
                .build());

        return notification;
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(UUID recipientId, Pageable pageable) {
        Page<Notification> page = notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(recipientId, pageable);
        return PageResponse.from(page.map(NotificationResponse::from));
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID recipientId) {
        return notificationRepository.countByRecipientIdAndReadFalse(recipientId);
    }

    @Transactional
    public void markRead(UUID recipientId, UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Notification", notificationId.toString()));
        if (!notification.getRecipientId().equals(recipientId)) {
            throw new ForbiddenException("You do not have access to this notification");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllRead(UUID recipientId) {
        notificationRepository.markAllRead(recipientId);
    }
}
