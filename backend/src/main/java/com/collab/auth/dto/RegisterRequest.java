package com.collab.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 3, max = 64)
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "username may only contain letters, digits, '.', '_' and '-'")
        String username,
        @Size(max = 128) String firstName,
        @Size(max = 128) String lastName,
        @NotBlank @Size(min = 8, max = 72) String password) {
}
