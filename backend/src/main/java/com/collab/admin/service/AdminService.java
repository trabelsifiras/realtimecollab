package com.collab.admin.service;

import com.collab.admin.dto.AdminUpdateUserRequest;
import com.collab.common.api.PageResponse;
import com.collab.common.exception.BadRequestException;
import com.collab.common.exception.ForbiddenException;
import com.collab.common.exception.NotFoundException;
import com.collab.common.security.SecurityUtils;
import com.collab.user.domain.User;
import com.collab.user.domain.UserRole;
import com.collab.user.dto.UserResponse;
import com.collab.user.repository.UserRepository;
import com.collab.workspace.domain.Workspace;
import com.collab.workspace.domain.WorkspaceMember;
import com.collab.workspace.domain.WorkspaceRole;
import com.collab.workspace.dto.UpdateMemberRoleRequest;
import com.collab.workspace.dto.WorkspaceMemberResponse;
import com.collab.workspace.dto.WorkspaceResponse;
import com.collab.workspace.repository.WorkspaceMemberRepository;
import com.collab.workspace.repository.WorkspaceRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Backoffice operations restricted to the global root administrator. Manages
 * users, workspaces and workspace role assignment.
 */
@Service
public class AdminService {

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;

    public AdminService(UserRepository userRepository,
                        WorkspaceRepository workspaceRepository,
                        WorkspaceMemberRepository memberRepository) {
        this.userRepository = userRepository;
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> listUsers(String query, Pageable pageable) {
        requireRootAdmin();
        if (query == null || query.isBlank()) {
            return PageResponse.from(userRepository.findAll(pageable).map(UserResponse::from));
        }
        String q = query.trim().toLowerCase();
        Specification<User> spec = (root, cq, cb) -> cb.or(
                cb.like(cb.lower(root.get("username")), "%" + q + "%"),
                cb.like(cb.lower(root.get("email")), "%" + q + "%"),
                cb.like(cb.lower(cb.coalesce(root.get("firstName"), "")), "%" + q + "%"),
                cb.like(cb.lower(cb.coalesce(root.get("lastName"), "")), "%" + q + "%"));
        return PageResponse.from(userRepository.findAll(spec, pageable).map(UserResponse::from));
    }

    @Transactional
    public UserResponse updateUser(UUID userId, AdminUpdateUserRequest request) {
        UUID actorId = SecurityUtils.currentUserId();
        requireRootAdmin(actorId);
        User target = findUser(userId);

        if (request.role() != null && request.role() != target.getRole()) {
            if (target.getId().equals(actorId)) {
                throw new ForbiddenException("You cannot change your own role");
            }
            target.setRole(request.role());
        }
        if (request.active() != null && request.active() != target.isActive()) {
            if (target.getId().equals(actorId)) {
                throw new ForbiddenException("You cannot deactivate your own account");
            }
            target.setActive(request.active());
        }

        return UserResponse.from(userRepository.save(target));
    }

    @Transactional(readOnly = true)
    public List<WorkspaceResponse> listWorkspaces() {
        requireRootAdmin();
        return workspaceRepository.findAll(org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "createdAt")).stream()
                .map(WorkspaceResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<WorkspaceMemberResponse> listMembers(UUID workspaceId) {
        requireRootAdmin();
        requireWorkspace(workspaceId);
        List<WorkspaceMember> members = memberRepository.findAllByWorkspaceId(workspaceId);
        Map<UUID, User> users = userRepository.findAllById(
                        members.stream().map(WorkspaceMember::getUserId).toList()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return members.stream()
                .map(m -> WorkspaceMemberResponse.from(m, UserResponse.from(users.get(m.getUserId()))))
                .toList();
    }

    @Transactional
    public WorkspaceMemberResponse assignRole(UUID workspaceId, UUID memberUserId, UpdateMemberRoleRequest request) {
        UUID actorId = SecurityUtils.currentUserId();
        requireRootAdmin(actorId);
        WorkspaceMember member = findMember(workspaceId, memberUserId);

        if (member.getUserId().equals(actorId)) {
            throw new ForbiddenException("You cannot change your own role");
        }
        if (member.getRole() == WorkspaceRole.OWNER && request.role() != WorkspaceRole.OWNER) {
            long owners = memberRepository.countByWorkspaceIdAndRole(workspaceId, WorkspaceRole.OWNER);
            if (owners <= 1) {
                throw new BadRequestException("LAST_OWNER", "A workspace must retain at least one owner");
            }
        }

        member.setRole(request.role());
        member = memberRepository.save(member);
        return WorkspaceMemberResponse.from(member, UserResponse.from(findUser(member.getUserId())));
    }

    @Transactional
    public void removeMember(UUID workspaceId, UUID memberUserId) {
        requireRootAdmin();
        WorkspaceMember member = findMember(workspaceId, memberUserId);
        if (member.getRole() == WorkspaceRole.OWNER) {
            long owners = memberRepository.countByWorkspaceIdAndRole(workspaceId, WorkspaceRole.OWNER);
            if (owners <= 1) {
                throw new BadRequestException("LAST_OWNER", "A workspace must retain at least one owner");
            }
        }
        memberRepository.deleteByWorkspaceIdAndUserId(workspaceId, memberUserId);
    }

    // ------------------------------------------------------------- helpers

    private void requireRootAdmin() {
        requireRootAdmin(SecurityUtils.currentUserId());
    }

    private void requireRootAdmin(UUID actorId) {
        User actor = findUser(actorId);
        if (actor.getRole() != UserRole.ROOT_ADMIN) {
            throw new ForbiddenException("Root admin privileges required");
        }
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User", userId.toString()));
    }

    private Workspace requireWorkspace(UUID workspaceId) {
        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Workspace", workspaceId.toString()));
    }

    private WorkspaceMember findMember(UUID workspaceId, UUID memberUserId) {
        return memberRepository.findByWorkspaceIdAndUserId(workspaceId, memberUserId)
                .orElseThrow(() -> new NotFoundException("WorkspaceMember", memberUserId.toString()));
    }
}
