package com.collab.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(min = 3, max = 64)
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "username may only contain letters, digits, '.', '_' and '-'")
        String username,
        @Size(max = 128) String firstName,
        @Size(max = 128) String lastName) {
}
