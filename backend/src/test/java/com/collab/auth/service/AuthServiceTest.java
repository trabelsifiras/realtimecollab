package com.collab.auth.service;

import com.collab.auth.domain.RefreshToken;
import com.collab.auth.dto.AuthResponse;
import com.collab.auth.dto.LoginRequest;
import com.collab.auth.dto.RegisterRequest;
import com.collab.auth.repository.RefreshTokenRepository;
import com.collab.common.exception.ConflictException;
import com.collab.common.security.JwtService;
import com.collab.user.domain.User;
import com.collab.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    @Test
    void registersNewUserAndIssuesTokens() {
        RegisterRequest request = new RegisterRequest("firas@example.com", "firas", "Firas", "M", "password123");

        when(userRepository.existsByEmailIgnoreCase("firas@example.com")).thenReturn(false);
        when(userRepository.existsByUsernameIgnoreCase("firas")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(jwtService.generateAccessToken(any(UUID.class), anyString(), anyString())).thenReturn("access-token");
        when(jwtService.refreshTokenExpirationMillis()).thenReturn(604_800_000L);

        AuthResponse response = authService.register(request);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isNotBlank();
        assertThat(response.user().email()).isEqualTo("firas@example.com");
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void rejectsDuplicateEmail() {
        RegisterRequest request = new RegisterRequest("firas@example.com", "firas", null, null, "password123");
        when(userRepository.existsByEmailIgnoreCase("firas@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("email");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void loginRejectsWrongPassword() {
        User user = User.builder()
                .email("firas@example.com")
                .username("firas")
                .passwordHash("hashed")
                .build();
        user.setId(UUID.randomUUID());
        when(userRepository.findByEmailIgnoreCase("firas@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("firas@example.com", "wrong")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void loginIssuesTokensOnSuccess() {
        User user = User.builder()
                .email("firas@example.com")
                .username("firas")
                .passwordHash("hashed")
                .build();
        user.setId(UUID.randomUUID());
        when(userRepository.findByEmailIgnoreCase("firas@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("correct", "hashed")).thenReturn(true);
        when(jwtService.generateAccessToken(any(UUID.class), anyString(), anyString())).thenReturn("access-token");
        when(jwtService.refreshTokenExpirationMillis()).thenReturn(604_800_000L);

        AuthResponse response = authService.login(new LoginRequest("firas@example.com", "correct"));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.user().username()).isEqualTo("firas");
    }
}
