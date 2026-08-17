package com.collab.task.domain;

/**
 * The directed relationship kinds available between two tasks.
 * The {@code inverse} is stored on the target side so both directions
 * can be queried consistently.
 */
public enum TaskLinkType {
    BLOCKS,
    RELATES_TO,
    DUPLICATES,
    CLONES
}
