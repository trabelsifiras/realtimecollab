package com.collab.channel.controller;

import com.collab.channel.dto.ChannelMemberResponse;
import com.collab.channel.dto.ChannelRequest;
import com.collab.channel.dto.ChannelResponse;
import com.collab.channel.service.ChannelService;
import com.collab.common.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Channels")
public class ChannelController {

    private final ChannelService channelService;

    public ChannelController(ChannelService channelService) {
        this.channelService = channelService;
    }

    @PostMapping("/workspaces/{workspaceId}/channels")
    @Operation(summary = "Create a channel in a workspace")
    public ResponseEntity<ChannelResponse> create(@PathVariable UUID workspaceId, @Valid @RequestBody ChannelRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(channelService.create(workspaceId, SecurityUtils.currentUserId(), request));
    }

    @GetMapping("/workspaces/{workspaceId}/channels")
    @Operation(summary = "List channels visible to the current user")
    public ResponseEntity<List<ChannelResponse>> list(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(channelService.list(workspaceId, SecurityUtils.currentUserId()));
    }

    @GetMapping("/channels/{id}")
    @Operation(summary = "Get a channel")
    public ResponseEntity<ChannelResponse> get(@PathVariable UUID id) {
        return ResponseEntity.ok(channelService.get(id, SecurityUtils.currentUserId()));
    }

    @PatchMapping("/channels/{id}")
    @Operation(summary = "Update a channel")
    public ResponseEntity<ChannelResponse> update(@PathVariable UUID id, @Valid @RequestBody ChannelRequest request) {
        return ResponseEntity.ok(channelService.update(id, SecurityUtils.currentUserId(), request));
    }

    @DeleteMapping("/channels/{id}")
    @Operation(summary = "Delete a channel")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        channelService.delete(id, SecurityUtils.currentUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/channels/{id}/members/{userId}")
    @Operation(summary = "Add a member to a channel")
    public ResponseEntity<ChannelMemberResponse> addMember(@PathVariable UUID id, @PathVariable UUID userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(channelService.addMember(id, SecurityUtils.currentUserId(), userId));
    }

    @DeleteMapping("/channels/{id}/members/{userId}")
    @Operation(summary = "Remove a member from a channel")
    public ResponseEntity<Void> removeMember(@PathVariable UUID id, @PathVariable UUID userId) {
        channelService.removeMember(id, SecurityUtils.currentUserId(), userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/channels/{id}/members")
    @Operation(summary = "List channel members")
    public ResponseEntity<List<ChannelMemberResponse>> listMembers(@PathVariable UUID id) {
        return ResponseEntity.ok(channelService.listMembers(id, SecurityUtils.currentUserId()));
    }
}
