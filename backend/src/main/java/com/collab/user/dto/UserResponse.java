package com.collab.user.dto;

import com.collab.user.domain.User;
import com.collab.user.domain.UserRole;
import com.collab.user.domain.UserStatus;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String username,
        String firstName,
        String lastName,
        String avatarUrl,
        UserStatus status,
        UserRole role,
        boolean active,
        Instant createdAt,
        Instant lastSeenAt) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getFirstName(),
                user.getLastName(),
                user.getAvatarUrl(),
                user.getStatus(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt(),
                user.getLastSeenAt());
    }
}
