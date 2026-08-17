package com.collab.chat.service;

import com.collab.channel.domain.Channel;
import com.collab.channel.service.ChannelAccessService;
import com.collab.chat.domain.Message;
import com.collab.chat.dto.MessageRequest;
import com.collab.chat.dto.MessageResponse;
import com.collab.chat.repository.MessageRepository;
import com.collab.common.event.DomainEvent;
import com.collab.common.exception.ForbiddenException;
import com.collab.common.exception.NotFoundException;
import com.collab.notification.domain.NotificationType;
import com.collab.notification.service.NotificationService;
import com.collab.user.domain.User;
import com.collab.user.repository.UserRepository;
import com.collab.workspace.service.WorkspaceAccessService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MessageService {

    private static final Pattern MENTION_PATTERN = Pattern.compile("@([a-zA-Z0-9._-]+)");

    private final MessageRepository messageRepository;
    private final ChannelAccessService channelAccessService;
    private final WorkspaceAccessService workspaceAccessService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;

    public MessageService(MessageRepository messageRepository,
                          ChannelAccessService channelAccessService,
                          WorkspaceAccessService workspaceAccessService,
                          UserRepository userRepository,
                          NotificationService notificationService,
                          ApplicationEventPublisher eventPublisher) {
        this.messageRepository = messageRepository;
        this.channelAccessService = channelAccessService;
        this.workspaceAccessService = workspaceAccessService;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public MessageResponse send(UUID channelId, UUID actorId, MessageRequest request) {
        Channel channel = channelAccessService.requireAccess(channelId, actorId);

        Message message = Message.builder()
                .channelId(channelId)
                .senderId(actorId)
                .content(request.content().trim())
                .replyToMessageId(request.replyToMessageId())
                .build();
        message = messageRepository.save(message);

        processMentions(channel, actorId, message);

        eventPublisher.publishEvent(DomainEvent.builder("MESSAGE_CREATED")
                .workspaceId(channel.getWorkspaceId())
                .resourceId(channelId)
                .actorId(actorId)
                .payload(Map.of("messageId", message.getId().toString()))
                .build());

        return MessageResponse.from(message);
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> list(UUID channelId, UUID actorId, UUID before, int limit) {
        Channel channel = channelAccessService.requireAccess(channelId, actorId);

        Instant beforeInstant = null;
        if (before != null) {
            Message beforeMessage = messageRepository.findById(before)
                    .orElseThrow(() -> new NotFoundException("Message", before.toString()));
            beforeInstant = beforeMessage.getCreatedAt();
        }

        int safeLimit = Math.min(Math.max(limit, 1), 200);
        PageRequest pageRequest = PageRequest.of(0, safeLimit);
        List<Message> messages = beforeInstant == null
                ? messageRepository.findLatest(channelId, pageRequest)
                : messageRepository.findBefore(channelId, beforeInstant, pageRequest);

        return messages.stream()
                .map(MessageResponse::from)
                .toList();
    }

    @Transactional
    public MessageResponse update(UUID messageId, UUID actorId, MessageRequest request) {
        Message message = findMessage(messageId);
        requireSender(message, actorId);
        channelAccessService.requireAccess(message.getChannelId(), actorId);

        message.setContent(request.content().trim());
        message = messageRepository.save(message);

        publishMessageEvent("MESSAGE_UPDATED", message, actorId);
        return MessageResponse.from(message);
    }

    @Transactional
    public void delete(UUID messageId, UUID actorId) {
        Message message = findMessage(messageId);
        requireSender(message, actorId);
        Channel channel = channelAccessService.requireAccess(message.getChannelId(), actorId);

        message.setDeletedAt(Instant.now());
        messageRepository.save(message);

        publishMessageEvent("MESSAGE_DELETED", message, actorId);
    }

    private Message findMessage(UUID messageId) {
        return messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message", messageId.toString()));
    }

    private void requireSender(Message message, UUID actorId) {
        if (!message.getSenderId().equals(actorId)) {
            throw new ForbiddenException("Only the sender can modify this message");
        }
    }

    private void processMentions(Channel channel, UUID actorId, Message message) {
        Matcher matcher = MENTION_PATTERN.matcher(message.getContent());
        while (matcher.find()) {
            String username = matcher.group(1);
            userRepository.findByUsername(username).ifPresent(user -> {
                if (!user.getId().equals(actorId)
                        && workspaceAccessService.isMember(channel.getWorkspaceId(), user.getId())) {
                    notificationService.create(
                            user.getId(),
                            NotificationType.MENTION,
                            "You were mentioned",
                            "You were mentioned in a channel message",
                            "channel",
                            channel.getId().toString());
                }
            });
        }
    }

    private void publishMessageEvent(String type, Message message, UUID actorId) {
        Channel channel = channelAccessService.findChannel(message.getChannelId());
        eventPublisher.publishEvent(DomainEvent.builder(type)
                .workspaceId(channel.getWorkspaceId())
                .resourceId(message.getChannelId())
                .actorId(actorId)
                .payload(Map.of("messageId", message.getId().toString()))
                .build());
    }
}
