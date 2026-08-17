package com.collab.task.domain;

/**
 * Mirrors Jira issue types. SUBTASK implies a non-null {@code parentId};
 * EPIC is a large body of work that other issues can link to via {@code epicId}.
 */
public enum TaskType {
    EPIC,
    STORY,
    TASK,
    BUG,
    SUBTASK
}
