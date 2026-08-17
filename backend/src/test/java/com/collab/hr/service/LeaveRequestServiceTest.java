package com.collab.hr.service;

import com.collab.common.exception.BadRequestException;
import com.collab.common.exception.ForbiddenException;
import com.collab.hr.domain.LeaveRequest;
import com.collab.hr.domain.LeaveStatus;
import com.collab.hr.domain.LeaveType;
import com.collab.hr.dto.LeaveRequestRequest;
import com.collab.hr.dto.ReviewLeaveRequestRequest;
import com.collab.hr.repository.LeaveRequestRepository;
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
class LeaveRequestServiceTest {

    @Mock
    private LeaveRequestRepository leaveRequestRepository;
    @Mock
    private WorkspaceAccessService workspaceAccessService;

    @InjectMocks
    private LeaveRequestService leaveRequestService;

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();
    private final UUID leaveId = UUID.randomUUID();

    @Test
    void createRequiresMembership() {
        doThrow(new ForbiddenException("not a member"))
                .when(workspaceAccessService).requireMember(workspaceId, actorId);

        assertThatThrownBy(() -> leaveRequestService.create(workspaceId, actorId, request()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void createRejectsInvalidDateRange() {
        LeaveRequestRequest invalid = new LeaveRequestRequest(
                LeaveType.VACATION, LocalDate.now().plusDays(5), LocalDate.now(), null);

        assertThatThrownBy(() -> leaveRequestService.create(workspaceId, actorId, invalid))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void reviewApprovesPendingRequest() {
        LeaveRequest leaveRequest = LeaveRequest.builder()
                .workspaceId(workspaceId)
                .userId(UUID.randomUUID())
                .type(LeaveType.VACATION)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(2))
                .status(LeaveStatus.PENDING)
                .build();
        leaveRequest.setId(leaveId);

        when(leaveRequestRepository.findById(leaveId)).thenReturn(Optional.of(leaveRequest));
        when(leaveRequestRepository.save(any(LeaveRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = leaveRequestService.review(leaveId, actorId,
                new ReviewLeaveRequestRequest(LeaveStatus.APPROVED, "Enjoy!"));

        assertThat(response.status()).isEqualTo(LeaveStatus.APPROVED);
        assertThat(response.reviewedBy()).isEqualTo(actorId);
    }

    private LeaveRequestRequest request() {
        return new LeaveRequestRequest(LeaveType.VACATION, LocalDate.now(), LocalDate.now().plusDays(2), null);
    }
}
