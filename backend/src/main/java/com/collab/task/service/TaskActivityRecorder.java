package com.collab.task.service;

import com.collab.task.domain.TaskActivity;
import com.collab.task.domain.TaskActivityType;
import com.collab.task.repository.TaskActivityRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Records append-only task audit entries. Runs in the same transaction as the
 * mutation that triggered it so history is always consistent with the change.
 */
@Component
public class TaskActivityRecorder {

    private final TaskActivityRepository activityRepository;

    public TaskActivityRecorder(TaskActivityRepository activityRepository) {
        this.activityRepository = activityRepository;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID taskId, UUID actorId, TaskActivityType type,
                       String field, String oldValue, String newValue) {
        activityRepository.save(TaskActivity.builder()
                .taskId(taskId)
                .actorId(actorId)
                .type(type)
                .field(field)
                .oldValue(oldValue)
                .newValue(newValue)
                .build());
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID taskId, UUID actorId, TaskActivityType type) {
        record(taskId, actorId, type, null, null, null);
    }
}
