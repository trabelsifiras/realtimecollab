package com.collab.channel.dto;

import com.collab.channel.domain.ChannelMember;
import com.collab.user.dto.UserResponse;

import java.util.UUID;

public record ChannelMemberResponse(
        UUID id,
        UUID channelId,
        UUID userId,
        UserResponse user) {

    public static ChannelMemberResponse from(ChannelMember member, UserResponse user) {
        return new ChannelMemberResponse(member.getId(), member.getChannelId(), member.getUserId(), user);
    }
}
