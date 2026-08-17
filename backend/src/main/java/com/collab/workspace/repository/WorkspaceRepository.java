package com.collab.workspace.repository;

import com.collab.workspace.domain.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    boolean existsBySlug(String slug);

    Optional<Workspace> findBySlug(String slug);

    @Query("""
            select distinct w from Workspace w
            join WorkspaceMember m on m.workspaceId = w.id
            where m.userId = :userId
            order by w.createdAt desc
            """)
    List<Workspace> findAllForUser(@Param("userId") UUID userId);
}
