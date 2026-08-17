package com.collab.hr.service;

import com.collab.common.exception.BadRequestException;
import com.collab.common.exception.NotFoundException;
import com.collab.hr.domain.LeaveRequest;
import com.collab.hr.domain.LeaveStatus;
import com.collab.hr.dto.LeaveRequestRequest;
import com.collab.hr.dto.LeaveRequestResponse;
import com.collab.hr.dto.ReviewLeaveRequestRequest;
import com.collab.hr.repository.LeaveRequestRepository;
import com.collab.workspace.service.WorkspaceAccessService;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class LeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final WorkspaceAccessService workspaceAccessService;

    public LeaveRequestService(LeaveRequestRepository leaveRequestRepository,
                               WorkspaceAccessService workspaceAccessService) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.workspaceAccessService = workspaceAccessService;
    }

    @Transactional
    public LeaveRequestResponse create(UUID workspaceId, UUID actorId, LeaveRequestRequest request) {
        workspaceAccessService.requireMember(workspaceId, actorId);
        validateDates(request.startDate(), request.endDate());

        LeaveRequest leaveRequest = leaveRequestRepository.save(LeaveRequest.builder()
                .workspaceId(workspaceId)
                .userId(actorId)
                .type(request.type())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .reason(trimToNull(request.reason()))
                .status(LeaveStatus.PENDING)
                .build());

        return LeaveRequestResponse.from(leaveRequest);
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestResponse> listMine(UUID workspaceId, UUID actorId, LeaveStatus status) {
        workspaceAccessService.requireMember(workspaceId, actorId);
        Specification<LeaveRequest> spec = (root, cq, cb) -> cb.and(
                cb.equal(root.get("workspaceId"), workspaceId),
                cb.equal(root.get("userId"), actorId));
        if (status != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("status"), status));
        }
        return leaveRequestRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "startDate")).stream()
                .map(LeaveRequestResponse::from)
                .toList();
    }

    @Transactional
    public LeaveRequestResponse cancel(UUID leaveRequestId, UUID actorId) {
        LeaveRequest leaveRequest = requireOwn(leaveRequestId, actorId);
        if (leaveRequest.getStatus() != LeaveStatus.PENDING && leaveRequest.getStatus() != LeaveStatus.APPROVED) {
            throw new BadRequestException("NOT_CANCELLABLE", "Only pending or approved requests can be cancelled");
        }
        leaveRequest.setStatus(LeaveStatus.CANCELLED);
        return LeaveRequestResponse.from(leaveRequestRepository.save(leaveRequest));
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestResponse> listTeam(UUID workspaceId, UUID actorId, LeaveStatus status, UUID userId) {
        workspaceAccessService.requireHr(workspaceId, actorId);
        Specification<LeaveRequest> spec = (root, cq, cb) -> cb.equal(root.get("workspaceId"), workspaceId);
        if (status != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("status"), status));
        }
        if (userId != null) {
            spec = spec.and((root, cq, cb) -> cb.equal(root.get("userId"), userId));
        }
        return leaveRequestRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "startDate")).stream()
                .map(LeaveRequestResponse::from)
                .toList();
    }

    @Transactional
    public LeaveRequestResponse review(UUID leaveRequestId, UUID actorId, ReviewLeaveRequestRequest request) {
        LeaveRequest leaveRequest = find(leaveRequestId);
        workspaceAccessService.requireHr(leaveRequest.getWorkspaceId(), actorId);

        if (leaveRequest.getStatus() != LeaveStatus.PENDING) {
            throw new BadRequestException("NOT_PENDING", "Only pending requests can be reviewed");
        }
        if (request.status() != LeaveStatus.APPROVED && request.status() != LeaveStatus.REJECTED) {
            throw new BadRequestException("INVALID_REVIEW_STATUS", "Review status must be APPROVED or REJECTED");
        }

        leaveRequest.setStatus(request.status());
        leaveRequest.setReviewedBy(actorId);
        leaveRequest.setReviewedAt(Instant.now());
        leaveRequest.setReviewNote(trimToNull(request.reviewNote()));

        return LeaveRequestResponse.from(leaveRequestRepository.save(leaveRequest));
    }

    // ------------------------------------------------------------- helpers

    private LeaveRequest requireOwn(UUID leaveRequestId, UUID actorId) {
        LeaveRequest leaveRequest = find(leaveRequestId);
        workspaceAccessService.requireMember(leaveRequest.getWorkspaceId(), actorId);
        if (!leaveRequest.getUserId().equals(actorId)) {
            throw new NotFoundException("LeaveRequest", leaveRequestId.toString());
        }
        return leaveRequest;
    }

    private LeaveRequest find(UUID leaveRequestId) {
        return leaveRequestRepository.findById(leaveRequestId)
                .orElseThrow(() -> new NotFoundException("LeaveRequest", leaveRequestId.toString()));
    }

    private void validateDates(java.time.LocalDate startDate, java.time.LocalDate endDate) {
        if (endDate.isBefore(startDate)) {
            throw new BadRequestException("INVALID_DATE_RANGE", "End date must not be before start date");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
