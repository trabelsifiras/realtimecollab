package com.collab.common.security;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService(new JwtProperties(
            "test-secret-key-that-is-at-least-256-bits-long-1234567890",
            900_000,
            604_800_000,
            "test-issuer"));

    @Test
    void generatesAndParsesAccessToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateAccessToken(userId, "firas@example.com", "firas");

        UserPrincipal principal = jwtService.parseAccessToken(token);

        assertThat(principal.id()).isEqualTo(userId);
        assertThat(principal.email()).isEqualTo("firas@example.com");
        assertThat(principal.username()).isEqualTo("firas");
    }

    @Test
    void rejectsInvalidToken() {
        assertThat(jwtService.isValidAccessToken("not-a-valid-token")).isFalse();
    }

    @Test
    void rejectsTokenSignedWithDifferentKey() {
        JwtService other = new JwtService(new JwtProperties(
                "a-completely-different-secret-key-9876543210-abcdefgh",
                900_000, 604_800_000, "test-issuer"));
        String token = other.generateAccessToken(UUID.randomUUID(), "a@b.c", "user");

        assertThatThrownBy(() -> jwtService.parseAccessToken(token))
                .isInstanceOf(io.jsonwebtoken.JwtException.class);
    }
}
