package com.collab.task.domain;

import com.collab.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * A directed relationship between two tasks (Jira "linked issues").
 * The inverse relationship is materialised by querying from the target side.
 */
@Entity
@Table(name = "task_links")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskLink extends BaseEntity {

    @Column(name = "source_task_id", nullable = false)
    private UUID sourceTaskId;

    @Column(name = "target_task_id", nullable = false)
    private UUID targetTaskId;

    @Enumerated(EnumType.STRING)
    @Column(name = "link_type", nullable = false, length = 32)
    private TaskLinkType linkType;
}
