package com.collab.task.repository;

import com.collab.task.domain.TaskLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskLinkRepository extends JpaRepository<TaskLink, UUID> {

    List<TaskLink> findBySourceTaskIdOrderByCreatedAtAsc(UUID sourceTaskId);

    List<TaskLink> findByTargetTaskIdOrderByCreatedAtAsc(UUID targetTaskId);

    boolean existsBySourceTaskIdAndTargetTaskIdAndLinkType(UUID sourceTaskId, UUID targetTaskId,
                                                          com.collab.task.domain.TaskLinkType linkType);
}
