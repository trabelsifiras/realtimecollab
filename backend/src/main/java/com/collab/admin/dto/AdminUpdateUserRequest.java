package com.collab.admin.dto;

import com.collab.user.domain.UserRole;

public record AdminUpdateUserRequest(
        UserRole role,
        Boolean active) {
}
