package com.collab.common.event;

import java.util.Map;
import java.util.UUID;

/**
 * Shared domain event envelope published by modules after durable state changes.
 * The realtime module converts these into WebSocket messages after transaction commit.
 */
public record DomainEvent(
        String type,
        UUID workspaceId,
        UUID projectId,
        UUID resourceId,
        UUID actorId,
        UUID recipientId,
        Map<String, Object> payload) {

    public static DomainEventBuilder builder(String type) {
        return new DomainEventBuilder(type);
    }

    public static final class DomainEventBuilder {
        private final String type;
        private UUID workspaceId;
        private UUID projectId;
        private UUID resourceId;
        private UUID actorId;
        private UUID recipientId;
        private Map<String, Object> payload = Map.of();

        private DomainEventBuilder(String type) {
            this.type = type;
        }

        public DomainEventBuilder workspaceId(UUID value) {
            this.workspaceId = value;
            return this;
        }

        public DomainEventBuilder projectId(UUID value) {
            this.projectId = value;
            return this;
        }

        public DomainEventBuilder resourceId(UUID value) {
            this.resourceId = value;
            return this;
        }

        public DomainEventBuilder actorId(UUID value) {
            this.actorId = value;
            return this;
        }

        public DomainEventBuilder recipientId(UUID value) {
            this.recipientId = value;
            return this;
        }

        public DomainEventBuilder payload(Map<String, Object> value) {
            this.payload = value == null ? Map.of() : value;
            return this;
        }

        public DomainEvent build() {
            return new DomainEvent(type, workspaceId, projectId, resourceId, actorId, recipientId, payload);
        }
    }
}
