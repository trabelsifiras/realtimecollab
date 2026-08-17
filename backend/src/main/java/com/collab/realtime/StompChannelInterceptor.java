package com.collab.realtime;

import com.collab.presence.service.PresenceService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class StompChannelInterceptor implements ChannelInterceptor {

    private final RealtimeAuthorizationService authorizationService;
    private final PresenceService presenceService;

    public StompChannelInterceptor(RealtimeAuthorizationService authorizationService,
                                   PresenceService presenceService) {
        this.authorizationService = authorizationService;
        this.presenceService = presenceService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        switch (accessor.getCommand()) {
            case CONNECT -> {
                UUID userId = readUserId(accessor);
                if (userId == null) {
                    throw new IllegalStateException("WebSocket connection is not authenticated");
                }
                accessor.setUser(new StompPrincipal(userId));
                presenceService.connected(userId);
            }
            case SUBSCRIBE -> {
                UUID userId = readUserId(accessor);
                String destination = accessor.getDestination();
                if (userId == null || !authorizationService.authorizeSubscribe(userId, destination)) {
                    throw new IllegalStateException("Subscription is not authorized");
                }
            }
            case SEND -> {
                UUID userId = readUserId(accessor);
                String destination = accessor.getDestination();
                if (userId == null || !authorizationService.authorizeSend(userId, destination)) {
                    throw new IllegalStateException("Message is not authorized");
                }
            }
            case DISCONNECT -> {
                UUID userId = readUserId(accessor);
                if (userId != null) {
                    presenceService.disconnected(userId);
                }
            }
            default -> {
                // no-op
            }
        }
        return message;
    }

    private UUID readUserId(StompHeaderAccessor accessor) {
        Object value = accessor.getSessionAttributes() == null
                ? null
                : accessor.getSessionAttributes().get(WebSocketHandshakeInterceptor.userIdAttribute());
        return value instanceof UUID uuid ? uuid : null;
    }
}
