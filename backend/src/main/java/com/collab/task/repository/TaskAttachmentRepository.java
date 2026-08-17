package com.collab.task.repository;

import com.collab.task.domain.TaskAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment, UUID> {

    List<TaskAttachment> findByTaskIdOrderByCreatedAtAsc(UUID taskId);
}
