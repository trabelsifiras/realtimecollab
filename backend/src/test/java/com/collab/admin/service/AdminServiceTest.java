package com.collab.admin.service;

import com.collab.admin.dto.AdminUpdateUserRequest;
import com.collab.common.exception.BadRequestException;
import com.collab.common.exception.ForbiddenException;
import com.collab.common.security.UserPrincipal;
import com.collab.user.domain.User;
import com.collab.user.domain.UserRole;
import com.collab.user.repository.UserRepository;
import com.collab.workspace.domain.WorkspaceMember;
import com.collab.workspace.domain.WorkspaceRole;
import com.collab.workspace.dto.UpdateMemberRoleRequest;
import com.collab.workspace.repository.WorkspaceMemberRepository;
import com.collab.workspace.repository.WorkspaceRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private WorkspaceRepository workspaceRepository;
    @Mock
    private WorkspaceMemberRepository memberRepository;

    @InjectMocks
    private AdminService adminService;

    private final UUID actorId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID memberId = UUID.randomUUID();

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void nonRootAdminCannotListUsers() {
        authenticate(actorId, UserRole.USER);

        assertThatThrownBy(() -> adminService.listUsers(null, Pageable.unpaged()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void rootAdminCannotChangeOwnRole() {
        authenticate(actorId, UserRole.ROOT_ADMIN);

        assertThatThrownBy(() -> adminService.updateUser(actorId, new AdminUpdateUserRequest(UserRole.USER, null)))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("own role");
    }

    @Test
    void cannotDemoteLastOwner() {
        authenticate(actorId, UserRole.ROOT_ADMIN);

        WorkspaceMember owner = WorkspaceMember.builder()
                .workspaceId(workspaceId)
                .userId(memberId)
                .role(WorkspaceRole.OWNER)
                .build();
        when(memberRepository.findByWorkspaceIdAndUserId(workspaceId, memberId)).thenReturn(Optional.of(owner));
        when(memberRepository.countByWorkspaceIdAndRole(workspaceId, WorkspaceRole.OWNER)).thenReturn(1L);

        assertThatThrownBy(() -> adminService.assignRole(workspaceId, memberId, new UpdateMemberRoleRequest(WorkspaceRole.MEMBER)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("at least one owner");
    }

    private void authenticate(UUID userId, UserRole role) {
        User actor = User.builder()
                .email(userId + "@example.com")
                .username("admin")
                .role(role)
                .build();
        actor.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(actor));

        var principal = new UserPrincipal(userId, actor.getEmail(), actor.getUsername());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }
}
