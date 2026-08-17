package com.collab.task.domain;

import com.collab.common.domain.BaseEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "tasks")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Task extends BaseEntity {

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    /** Jira-style human readable key, e.g. {@code PROJ-123}. */
    @Column(nullable = false, unique = true, length = 32)
    private String key;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private TaskType type = TaskType.TASK;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private TaskStatus status = TaskStatus.TODO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private TaskPriority priority = TaskPriority.MEDIUM;

    @Column(name = "assignee_id")
    private UUID assigneeId;

    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @Column(name = "parent_id")
    private UUID parentId;

    @Column(name = "epic_id")
    private UUID epicId;

    @Column(name = "story_points")
    private Integer storyPoints;

    @Column(name = "start_date")
    private Instant startDate;

    @Column(name = "due_date")
    private Instant dueDate;

    @Column(name = "original_estimate_minutes")
    private Integer originalEstimateMinutes;

    @Column(name = "remaining_estimate_minutes")
    private Integer remainingEstimateMinutes;

    @Column(name = "logged_minutes")
    private Integer loggedMinutes;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "task_labels", joinColumns = @JoinColumn(name = "task_id"))
    @Column(name = "label", length = 64)
    @Builder.Default
    private Set<String> labels = new LinkedHashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "task_watchers", joinColumns = @JoinColumn(name = "task_id"))
    @Column(name = "user_id")
    @Builder.Default
    private Set<UUID> watchers = new HashSet<>();

    @Column
    private Integer position;

    @Version
    @Column(nullable = false)
    private Long version;

    @Column(name = "completed_at")
    private Instant completedAt;
}
