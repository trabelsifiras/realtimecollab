package com.collab.task.repository;

import com.collab.task.domain.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID>, JpaSpecificationExecutor<Task> {

    @Query("select coalesce(max(t.position), 0) from Task t where t.projectId = :projectId")
    Integer findMaxPosition(@Param("projectId") UUID projectId);

    Optional<Task> findFirstByProjectIdOrderByPositionDesc(UUID projectId);

    List<Task> findByParentIdOrderByPositionAsc(UUID parentId);

    /** Allocates the next globally-unique issue key number from the database sequence. */
    @Query(value = "select nextval('task_key_seq')", nativeQuery = true)
    long nextKeyValue();
}
