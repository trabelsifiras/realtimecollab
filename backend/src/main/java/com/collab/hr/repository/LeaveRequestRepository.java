package com.collab.hr.repository;

import com.collab.hr.domain.LeaveRequest;
import com.collab.hr.domain.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID>, JpaSpecificationExecutor<LeaveRequest> {

    /** Approved leave requests overlapping [from, to]. */
    List<LeaveRequest> findByWorkspaceIdAndStatusAndEndDateGreaterThanEqualAndStartDateLessThanEqual(
            UUID workspaceId, LeaveStatus status, LocalDate from, LocalDate to);

    List<LeaveRequest> findByWorkspaceIdAndStatus(UUID workspaceId, LeaveStatus status);
}
