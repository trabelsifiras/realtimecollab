package com.collab.channel.service;

import com.collab.channel.domain.Channel;
import com.collab.channel.domain.ChannelMember;
import com.collab.channel.domain.ChannelType;
import com.collab.channel.dto.ChannelMemberResponse;
import com.collab.channel.dto.ChannelRequest;
import com.collab.channel.dto.ChannelResponse;
import com.collab.channel.repository.ChannelMemberRepository;
import com.collab.channel.repository.ChannelRepository;
import com.collab.common.exception.BadRequestException;
import com.collab.common.exception.ConflictException;
import com.collab.common.exception.ForbiddenException;
import com.collab.common.exception.NotFoundException;
import com.collab.user.domain.User;
import com.collab.user.dto.UserResponse;
import com.collab.user.repository.UserRepository;
import com.collab.workspace.service.WorkspaceAccessService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ChannelService {

    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final UserRepository userRepository;

    public ChannelService(ChannelRepository channelRepository,
                          ChannelMemberRepository channelMemberRepository,
                          WorkspaceAccessService workspaceAccessService,
                          UserRepository userRepository) {
        this.channelRepository = channelRepository;
        this.channelMemberRepository = channelMemberRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.userRepository = userRepository;
    }

    @Transactional
    public ChannelResponse create(UUID workspaceId, UUID actorId, ChannelRequest request) {
        workspaceAccessService.requireMember(workspaceId, actorId);

        String name = resolveName(request);
        Channel channel = Channel.builder()
                .workspaceId(workspaceId)
                .name(name)
                .description(trimToNull(request.description()))
                .type(request.type())
                .createdBy(actorId)
                .build();
        channel = channelRepository.save(channel);

        if (request.type() != ChannelType.PUBLIC) {
            addMemberInternal(channel, actorId);
            if (request.memberIds() != null) {
                for (UUID memberId : request.memberIds()) {
                    if (!memberId.equals(actorId)) {
                        workspaceAccessService.requireMember(workspaceId, memberId);
                        addMemberInternal(channel, memberId);
                    }
                }
            }
        }

        return ChannelResponse.from(channel);
    }

    @Transactional(readOnly = true)
    public List<ChannelResponse> list(UUID workspaceId, UUID actorId) {
        workspaceAccessService.requireMember(workspaceId, actorId);
        List<Channel> channels = channelRepository.findAllByWorkspaceIdOrderByCreatedAtAsc(workspaceId);
        List<UUID> privateChannelIds = channelMemberRepository.findChannelIdsByUserId(actorId);

        return channels.stream()
                .filter(c -> c.getType() == ChannelType.PUBLIC || privateChannelIds.contains(c.getId()))
                .map(ChannelResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ChannelResponse get(UUID channelId, UUID actorId) {
        Channel channel = channelAccess(channelId, actorId);
        return ChannelResponse.from(channel);
    }

    @Transactional
    public ChannelResponse update(UUID channelId, UUID actorId, ChannelRequest request) {
        Channel channel = channelAccess(channelId, actorId);
        requireAdmin(channel, actorId);

        if (request.name() != null && !request.name().isBlank()) {
            channel.setName(request.name().trim());
        }
        channel.setDescription(trimToNull(request.description()));
        return ChannelResponse.from(channelRepository.save(channel));
    }

    @Transactional
    public void delete(UUID channelId, UUID actorId) {
        Channel channel = channelAccess(channelId, actorId);
        requireAdmin(channel, actorId);
        channelRepository.deleteById(channelId);
    }

    @Transactional
    public ChannelMemberResponse addMember(UUID channelId, UUID actorId, UUID memberUserId) {
        Channel channel = channelAccess(channelId, actorId);
        requireAdmin(channel, actorId);
        workspaceAccessService.requireMember(channel.getWorkspaceId(), memberUserId);

        if (channelMemberRepository.existsByChannelIdAndUserId(channelId, memberUserId)) {
            throw new ConflictException("ALREADY_MEMBER", "User is already a member of this channel");
        }

        ChannelMember member = addMemberInternal(channel, memberUserId);
        User user = userRepository.findById(memberUserId)
                .orElseThrow(() -> new NotFoundException("User", memberUserId.toString()));
        return ChannelMemberResponse.from(member, UserResponse.from(user));
    }

    @Transactional
    public void removeMember(UUID channelId, UUID actorId, UUID memberUserId) {
        Channel channel = channelAccess(channelId, actorId);
        requireAdmin(channel, actorId);
        channelMemberRepository.deleteByChannelIdAndUserId(channelId, memberUserId);
    }

    @Transactional(readOnly = true)
    public List<ChannelMemberResponse> listMembers(UUID channelId, UUID actorId) {
        channelAccess(channelId, actorId);
        List<ChannelMember> members = channelMemberRepository.findAllByChannelId(channelId);
        Map<UUID, User> users = userRepository.findAllById(
                members.stream().map(ChannelMember::getUserId).toList())
                .stream().collect(Collectors.toMap(User::getId, u -> u));
        return members.stream()
                .map(m -> {
                    User user = users.get(m.getUserId());
                    return ChannelMemberResponse.from(m, user != null ? UserResponse.from(user) : null);
                })
                .toList();
    }

    private Channel channelAccess(UUID channelId, UUID actorId) {
        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new NotFoundException("Channel", channelId.toString()));
        if (channel.getType() == ChannelType.PUBLIC) {
            workspaceAccessService.requireMember(channel.getWorkspaceId(), actorId);
        } else if (!channelMemberRepository.existsByChannelIdAndUserId(channelId, actorId)) {
            throw new ForbiddenException("You do not have access to this channel");
        }
        return channel;
    }

    private void requireAdmin(Channel channel, UUID actorId) {
        workspaceAccessService.requireAdmin(channel.getWorkspaceId(), actorId);
    }

    private ChannelMember addMemberInternal(Channel channel, UUID userId) {
        ChannelMember member = ChannelMember.builder()
                .channelId(channel.getId())
                .userId(userId)
                .createdAt(Instant.now())
                .build();
        return channelMemberRepository.save(member);
    }

    private String resolveName(ChannelRequest request) {
        if (request.name() != null && !request.name().isBlank()) {
            return request.name().trim();
        }
        if (request.type() == ChannelType.DIRECT) {
            return "direct";
        }
        throw new BadRequestException("INVALID_CHANNEL", "Channel name is required");
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
