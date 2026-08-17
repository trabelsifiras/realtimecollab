package com.collab.realtime;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record RealtimeEvent(
        UUID eventId,
        String type,
        Instant timestamp,
        UUID workspaceId,
        UUID projectId,
        UUID resourceId,
        UUID actorId,
        Map<String, Object> payload) {
}
