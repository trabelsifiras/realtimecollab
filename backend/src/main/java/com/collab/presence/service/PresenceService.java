package com.collab.presence.service;

import com.collab.common.event.DomainEvent;
import com.collab.realtime.RealtimeEventPublisher;
import com.collab.user.domain.User;
import com.collab.user.domain.UserStatus;
import com.collab.user.repository.UserRepository;
import com.collab.workspace.domain.WorkspaceMember;
import com.collab.workspace.repository.WorkspaceMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class PresenceService {

    private final Map<UUID, AtomicInteger> connectionCounts = new ConcurrentHashMap<>();
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;

    public PresenceService(UserRepository userRepository,
                           WorkspaceMemberRepository workspaceMemberRepository,
                           RealtimeEventPublisher realtimeEventPublisher) {
        this.userRepository = userRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
    }

    @Transactional
    public void connected(UUID userId) {
        int count = connectionCounts.computeIfAbsent(userId, k -> new AtomicInteger()).incrementAndGet();
        if (count == 1) {
            userRepository.findById(userId).ifPresent(user -> {
                user.setStatus(UserStatus.ONLINE);
                userRepository.save(user);
            });
            broadcastPresence(userId, "USER_ONLINE");
        }
    }

    @Transactional
    public void disconnected(UUID userId) {
        AtomicInteger counter = connectionCounts.get(userId);
        if (counter == null) {
            return;
        }
        if (counter.decrementAndGet() <= 0) {
            connectionCounts.remove(userId);
            userRepository.findById(userId).ifPresent(user -> {
                user.setStatus(UserStatus.OFFLINE);
                user.setLastSeenAt(Instant.now());
                userRepository.save(user);
            });
            broadcastPresence(userId, "USER_OFFLINE");
        }
    }

    public boolean isOnline(UUID userId) {
        AtomicInteger counter = connectionCounts.get(userId);
        return counter != null && counter.get() > 0;
    }

    private void broadcastPresence(UUID userId, String type) {
        List<UUID> workspaceIds = workspaceMemberRepository.findAllByUserId(userId).stream()
                .map(WorkspaceMember::getWorkspaceId)
                .toList();
        for (UUID workspaceId : workspaceIds) {
            realtimeEventPublisher.publish(DomainEvent.builder(type)
                    .workspaceId(workspaceId)
                    .resourceId(userId)
                    .actorId(userId)
                    .payload(Map.of("userId", userId.toString()))
                    .build());
        }
    }
}
