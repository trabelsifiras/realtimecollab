package com.collab.hr.service;

import com.collab.common.exception.BadRequestException;
import com.collab.common.exception.ForbiddenException;
import com.collab.hr.domain.TimeEntry;
import com.collab.hr.domain.TimeEntryStatus;
import com.collab.hr.dto.ReviewTimeEntryRequest;
import com.collab.hr.dto.TimeEntryRequest;
import com.collab.hr.repository.TimeEntryRepository;
import com.collab.project.domain.Project;
import com.collab.project.repository.ProjectRepository;
import com.collab.task.repository.TaskRepository;
import com.collab.workspace.service.WorkspaceAccessService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TimeEntryServiceTest {

    @Mock
    private TimeEntryRepository timeEntryRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private WorkspaceAccessService workspaceAccessService;

    @InjectMocks
    private TimeEntryService timeEntryService;

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();
    private final UUID entryId = UUID.randomUUID();

    @Test
    void createRequiresMembership() {
        doThrow(new ForbiddenException("not a member"))
                .when(workspaceAccessService).requireMember(workspaceId, actorId);

        assertThatThrownBy(() -> timeEntryService.create(workspaceId, actorId, request()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void createBuildsDraftEntry() {
        Project project = new Project();
        project.setId(projectId);
        project.setWorkspaceId(workspaceId);
        project.setName("Website");

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = timeEntryService.create(workspaceId, actorId, request());

        assertThat(response.status()).isEqualTo(TimeEntryStatus.DRAFT);
        assertThat(response.userId()).isEqualTo(actorId);
        assertThat(response.projectName()).isEqualTo("Website");
    }

    @Test
    void reviewRejectsDraftEntry() {
        TimeEntry entry = entry(TimeEntryStatus.DRAFT);
        when(timeEntryRepository.findById(entryId)).thenReturn(Optional.of(entry));

        assertThatThrownBy(() -> timeEntryService.review(entryId, actorId,
                new ReviewTimeEntryRequest(TimeEntryStatus.APPROVED, null)))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void reviewApprovesSubmittedEntry() {
        TimeEntry entry = entry(TimeEntryStatus.SUBMITTED);
        when(timeEntryRepository.findById(entryId)).thenReturn(Optional.of(entry));
        when(timeEntryRepository.save(any(TimeEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = timeEntryService.review(entryId, actorId,
                new ReviewTimeEntryRequest(TimeEntryStatus.APPROVED, null));

        assertThat(response.status()).isEqualTo(TimeEntryStatus.APPROVED);
        assertThat(response.reviewedBy()).isEqualTo(actorId);
    }

    private TimeEntry entry(TimeEntryStatus status) {
        TimeEntry entry = TimeEntry.builder()
                .workspaceId(workspaceId)
                .userId(UUID.randomUUID())
                .projectId(projectId)
                .entryDate(LocalDate.now())
                .durationMinutes(60)
                .status(status)
                .build();
        entry.setId(entryId);
        return entry;
    }

    private TimeEntryRequest request() {
        return new TimeEntryRequest(projectId, null, LocalDate.now(), 60, "Worked on login");
    }
}
