package com.collab.common.security;

import java.util.UUID;

public record UserPrincipal(UUID id, String email, String username) {
}
