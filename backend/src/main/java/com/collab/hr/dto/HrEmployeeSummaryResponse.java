package com.collab.hr.dto;

import com.collab.workspace.domain.WorkspaceRole;

import java.util.UUID;

/**
 * Per-employee rollup shown on the HR dashboard for a given date range.
 */
public record HrEmployeeSummaryResponse(
        UUID userId,
        String firstName,
        String lastName,
        String username,
        String avatarUrl,
        WorkspaceRole role,
        long totalMinutes,
        long submittedMinutes,
        long approvedMinutes,
        long pendingTimeEntries,
        int vacationDays,
        int sickDays,
        int personalDays,
        int unpaidDays,
        int otherDays,
        long pendingLeaveRequests) {
}
