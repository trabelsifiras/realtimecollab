package com.collab.realtime;

import com.collab.channel.domain.Channel;
import com.collab.channel.service.ChannelAccessService;
import com.collab.common.event.DomainEvent;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@Controller
public class StompRealtimeController {

    private final ChannelAccessService channelAccessService;
    private final RealtimeEventPublisher realtimeEventPublisher;

    public StompRealtimeController(ChannelAccessService channelAccessService,
                                   RealtimeEventPublisher realtimeEventPublisher) {
        this.channelAccessService = channelAccessService;
        this.realtimeEventPublisher = realtimeEventPublisher;
    }

    @MessageMapping("/channels/{channelId}/typing")
    public void typing(@DestinationVariable UUID channelId, @Payload TypingRequest request, Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        Channel channel = channelAccessService.requireAccess(channelId, userId);

        String type = request.typing() ? "TYPING_STARTED" : "TYPING_STOPPED";
        realtimeEventPublisher.publish(DomainEvent.builder(type)
                .workspaceId(channel.getWorkspaceId())
                .resourceId(channelId)
                .actorId(userId)
                .payload(Map.of("userId", userId.toString()))
                .build());
    }
}
