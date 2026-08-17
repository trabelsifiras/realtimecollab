package com.collab.comment.repository;

import com.collab.comment.domain.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {

    List<Comment> findByTaskIdAndDeletedAtIsNullOrderByCreatedAtAsc(UUID taskId);

    long countByTaskIdAndDeletedAtIsNull(UUID taskId);
}
