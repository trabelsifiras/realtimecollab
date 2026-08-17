package com.collab.channel.service;

import com.collab.channel.domain.Channel;
import com.collab.channel.domain.ChannelType;
import com.collab.channel.repository.ChannelMemberRepository;
import com.collab.channel.repository.ChannelRepository;
import com.collab.common.exception.ForbiddenException;
import com.collab.common.exception.NotFoundException;
import com.collab.workspace.service.WorkspaceAccessService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ChannelAccessService {

    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final WorkspaceAccessService workspaceAccessService;

    public ChannelAccessService(ChannelRepository channelRepository,
                                ChannelMemberRepository channelMemberRepository,
                                WorkspaceAccessService workspaceAccessService) {
        this.channelRepository = channelRepository;
        this.channelMemberRepository = channelMemberRepository;
        this.workspaceAccessService = workspaceAccessService;
    }

    @Transactional(readOnly = true)
    public Channel requireAccess(UUID channelId, UUID userId) {
        Channel channel = findChannel(channelId);
        if (channel.getType() == ChannelType.PUBLIC) {
            workspaceAccessService.requireMember(channel.getWorkspaceId(), userId);
        } else if (!channelMemberRepository.existsByChannelIdAndUserId(channelId, userId)) {
            throw new ForbiddenException("You do not have access to this channel");
        }
        return channel;
    }

    @Transactional(readOnly = true)
    public Channel findChannel(UUID channelId) {
        return channelRepository.findById(channelId)
                .orElseThrow(() -> new NotFoundException("Channel", channelId.toString()));
    }
}
