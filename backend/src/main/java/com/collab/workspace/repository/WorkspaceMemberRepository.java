package com.collab.workspace.repository;

import com.collab.workspace.domain.WorkspaceMember;
import com.collab.workspace.domain.WorkspaceRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, UUID> {

    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);

    boolean existsByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);

    void deleteByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);

    List<WorkspaceMember> findAllByWorkspaceId(UUID workspaceId);

    List<WorkspaceMember> findAllByUserId(UUID userId);

    long countByWorkspaceIdAndRole(UUID workspaceId, WorkspaceRole role);
}
