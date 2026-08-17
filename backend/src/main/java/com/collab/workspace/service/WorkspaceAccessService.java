package com.collab.workspace.service;

import com.collab.common.exception.ForbiddenException;
import com.collab.workspace.domain.WorkspaceMember;
import com.collab.workspace.domain.WorkspaceRole;
import com.collab.workspace.repository.WorkspaceMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Central authorization boundary for workspace membership and roles.
 * Other modules (project, task, channel, realtime) depend on this service
 * to enforce membership-based access control.
 */
@Service
public class WorkspaceAccessService {

    private final WorkspaceMemberRepository memberRepository;

    public WorkspaceAccessService(WorkspaceMemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Transactional(readOnly = true)
    public boolean isMember(UUID workspaceId, UUID userId) {
        return memberRepository.existsByWorkspaceIdAndUserId(workspaceId, userId);
    }

    @Transactional(readOnly = true)
    public Optional<WorkspaceMember> findMember(UUID workspaceId, UUID userId) {
        return memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId);
    }

    @Transactional(readOnly = true)
    public WorkspaceMember requireMember(UUID workspaceId, UUID userId) {
        return memberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new ForbiddenException("You are not a member of this workspace"));
    }

    @Transactional(readOnly = true)
    public WorkspaceMember requireRole(UUID workspaceId, UUID userId, WorkspaceRole... allowedRoles) {
        WorkspaceMember member = requireMember(workspaceId, userId);
        for (WorkspaceRole allowed : allowedRoles) {
            if (member.getRole() == allowed) {
                return member;
            }
        }
        throw new ForbiddenException("You do not have permission to perform this action");
    }

    @Transactional(readOnly = true)
    public WorkspaceMember requireAdmin(UUID workspaceId, UUID userId) {
        return requireRole(workspaceId, userId, WorkspaceRole.OWNER, WorkspaceRole.ADMIN);
    }

    /** HR role can view and manage employee time & leave records. */
    @Transactional(readOnly = true)
    public WorkspaceMember requireHr(UUID workspaceId, UUID userId) {
        return requireRole(workspaceId, userId, WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.HR);
    }

    @Transactional(readOnly = true)
    public WorkspaceMember requireOwner(UUID workspaceId, UUID userId) {
        return requireRole(workspaceId, userId, WorkspaceRole.OWNER);
    }
}
