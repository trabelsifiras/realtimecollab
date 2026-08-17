package com.collab.workspace.service;

import com.collab.common.event.DomainEvent;
import com.collab.common.exception.BadRequestException;
import com.collab.common.exception.ConflictException;
import com.collab.common.exception.ForbiddenException;
import com.collab.common.exception.NotFoundException;
import com.collab.common.util.SlugGenerator;
import com.collab.user.domain.User;
import com.collab.user.dto.UserResponse;
import com.collab.user.repository.UserRepository;
import com.collab.workspace.domain.Workspace;
import com.collab.workspace.domain.WorkspaceMember;
import com.collab.workspace.domain.WorkspaceRole;
import com.collab.workspace.dto.AddMemberRequest;
import com.collab.workspace.dto.UpdateMemberRoleRequest;
import com.collab.workspace.dto.WorkspaceMemberResponse;
import com.collab.workspace.dto.WorkspaceRequest;
import com.collab.workspace.dto.WorkspaceResponse;
import com.collab.workspace.repository.WorkspaceMemberRepository;
import com.collab.workspace.repository.WorkspaceRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    public WorkspaceService(WorkspaceRepository workspaceRepository,
                            WorkspaceMemberRepository memberRepository,
                            UserRepository userRepository,
                            ApplicationEventPublisher eventPublisher) {
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public WorkspaceResponse create(UUID userId, WorkspaceRequest request) {
        String slug = uniqueSlug(request.name());
        Workspace workspace = Workspace.builder()
                .name(request.name().trim())
                .description(trimToNull(request.description()))
                .slug(slug)
                .ownerId(userId)
                .build();
        workspace = workspaceRepository.save(workspace);

        WorkspaceMember member = WorkspaceMember.builder()
                .workspaceId(workspace.getId())
                .userId(userId)
                .role(WorkspaceRole.OWNER)
                .createdAt(Instant.now())
                .build();
        memberRepository.save(member);

        return WorkspaceResponse.from(workspace);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceResponse> list(UUID userId) {
        return workspaceRepository.findAllForUser(userId).stream()
                .map(WorkspaceResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkspaceResponse get(UUID workspaceId, UUID userId) {
        requireMember(workspaceId, userId);
        return WorkspaceResponse.from(findWorkspace(workspaceId));
    }

    @Transactional
    public WorkspaceResponse update(UUID workspaceId, UUID userId, WorkspaceRequest request) {
        Workspace workspace = findWorkspace(workspaceId);
        requireAdmin(workspaceId, userId);
        workspace.setName(request.name().trim());
        workspace.setDescription(trimToNull(request.description()));
        return WorkspaceResponse.from(workspaceRepository.save(workspace));
    }

    @Transactional
    public void delete(UUID workspaceId, UUID userId) {
        requireOwner(workspaceId, userId);
        workspaceRepository.deleteById(workspaceId);
    }

    @Transactional
    public WorkspaceMemberResponse addMember(UUID workspaceId, UUID actorId, AddMemberRequest request) {
        requireAdmin(workspaceId, actorId);
        Workspace workspace = findWorkspace(workspaceId);

        if (memberRepository.existsByWorkspaceIdAndUserId(workspaceId, request.userId())) {
            throw new ConflictException("ALREADY_MEMBER", "User is already a member of this workspace");
        }

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new NotFoundException("User", request.userId().toString()));

        WorkspaceMember member = WorkspaceMember.builder()
                .workspaceId(workspaceId)
                .userId(request.userId())
                .role(WorkspaceRole.MEMBER)
                .createdAt(Instant.now())
                .build();
        member = memberRepository.save(member);

        eventPublisher.publishEvent(DomainEvent.builder("WORKSPACE_MEMBER_ADDED")
                .workspaceId(workspace.getId())
                .resourceId(request.userId())
                .actorId(actorId)
                .recipientId(request.userId())
                .payload(Map.of("role", WorkspaceRole.MEMBER.name()))
                .build());

        return WorkspaceMemberResponse.from(member, UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public List<WorkspaceMemberResponse> listMembers(UUID workspaceId, UUID userId) {
        requireMember(workspaceId, userId);
        List<WorkspaceMember> members = memberRepository.findAllByWorkspaceId(workspaceId);
        Map<UUID, User> users = userRepository.findAllById(
                members.stream().map(WorkspaceMember::getUserId).toList())
                .stream().collect(java.util.stream.Collectors.toMap(User::getId, u -> u));

        return members.stream()
                .map(m -> {
                    User user = users.get(m.getUserId());
                    return WorkspaceMemberResponse.from(m, user != null ? UserResponse.from(user) : null);
                })
                .toList();
    }

    @Transactional
    public WorkspaceMemberResponse updateMemberRole(UUID workspaceId, UUID actorId, UUID memberUserId, UpdateMemberRoleRequest request) {
        requireAdmin(workspaceId, actorId);
        if (actorId.equals(memberUserId)) {
            throw new ForbiddenException("You cannot change your own role");
        }
        WorkspaceMember member = requireMember(workspaceId, memberUserId);

        if (member.getRole() == WorkspaceRole.OWNER && request.role() != WorkspaceRole.OWNER) {
            long owners = memberRepository.countByWorkspaceIdAndRole(workspaceId, WorkspaceRole.OWNER);
            if (owners <= 1) {
                throw new BadRequestException("LAST_OWNER", "A workspace must retain at least one owner");
            }
        }
        if (request.role() == WorkspaceRole.OWNER) {
            requireOwner(workspaceId, actorId);
        }

        member.setRole(request.role());
        member = memberRepository.save(member);

        User user = userRepository.findById(member.getUserId()).orElse(null);
        return WorkspaceMemberResponse.from(member, user != null ? UserResponse.from(user) : null);
    }

    @Transactional
    public void removeMember(UUID workspaceId, UUID actorId, UUID memberUserId) {
        requireAdmin(workspaceId, actorId);

        if (actorId.equals(memberUserId)) {
            throw new BadRequestException("CANNOT_REMOVE_SELF", "Use leave instead of removing yourself");
        }

        WorkspaceMember member = requireMember(workspaceId, memberUserId);
        if (member.getRole() == WorkspaceRole.OWNER) {
            throw new ForbiddenException("Cannot remove the workspace owner");
        }

        memberRepository.deleteByWorkspaceIdAndUserId(workspaceId, memberUserId);

        eventPublisher.publishEvent(DomainEvent.builder("WORKSPACE_MEMBER_REMOVED")
                .workspaceId(workspaceId)
                .resourceId(memberUserId)
                .actorId(actorId)
                .recipientId(memberUserId)
                .build());
    }

    private Workspace findWorkspace(UUID workspaceId) {
        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Workspace", workspaceId.toString()));
    }

    private WorkspaceMember requireMember(UUID workspaceId, UUID userId) {
        return memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new ForbiddenException("You are not a member of this workspace"));
    }

    private void requireAdmin(UUID workspaceId, UUID userId) {
        WorkspaceMember member = requireMember(workspaceId, userId);
        if (member.getRole() != WorkspaceRole.OWNER && member.getRole() != WorkspaceRole.ADMIN) {
            throw new ForbiddenException("Admin privileges required");
        }
    }

    private void requireOwner(UUID workspaceId, UUID userId) {
        WorkspaceMember member = requireMember(workspaceId, userId);
        if (member.getRole() != WorkspaceRole.OWNER) {
            throw new ForbiddenException("Owner privileges required");
        }
    }

    private String uniqueSlug(String name) {
        String base = SlugGenerator.toSlug(name);
        String slug = base;
        int suffix = 1;
        while (workspaceRepository.existsBySlug(slug)) {
            slug = base + "-" + suffix++;
        }
        return slug;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
