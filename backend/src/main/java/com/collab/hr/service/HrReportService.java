package com.collab.hr.service;

import com.collab.hr.domain.LeaveRequest;
import com.collab.hr.domain.LeaveStatus;
import com.collab.hr.domain.LeaveType;
import com.collab.hr.domain.TimeEntryStatus;
import com.collab.hr.dto.HrEmployeeSummaryResponse;
import com.collab.hr.dto.HrOverviewResponse;
import com.collab.hr.repository.LeaveRequestRepository;
import com.collab.hr.repository.TimeEntryRepository;
import com.collab.user.domain.User;
import com.collab.user.repository.UserRepository;
import com.collab.workspace.domain.WorkspaceMember;
import com.collab.workspace.repository.WorkspaceMemberRepository;
import com.collab.workspace.service.WorkspaceAccessService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Builds the HR dashboard: a per-employee rollup of logged hours and leave
 * usage over a date range. Access is restricted to HR, admin and owner roles.
 */
@Service
public class HrReportService {

    private final TimeEntryRepository timeEntryRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final WorkspaceAccessService workspaceAccessService;

    public HrReportService(TimeEntryRepository timeEntryRepository,
                           LeaveRequestRepository leaveRequestRepository,
                           WorkspaceMemberRepository memberRepository,
                           UserRepository userRepository,
                           WorkspaceAccessService workspaceAccessService) {
        this.timeEntryRepository = timeEntryRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.workspaceAccessService = workspaceAccessService;
    }

    @Transactional(readOnly = true)
    public HrOverviewResponse overview(UUID workspaceId, UUID actorId, LocalDate from, LocalDate to) {
        workspaceAccessService.requireHr(workspaceId, actorId);

        List<WorkspaceMember> members = memberRepository.findAllByWorkspaceId(workspaceId);
        Map<UUID, User> users = userRepository.findAllById(
                        members.stream().map(WorkspaceMember::getUserId).toList()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        Map<UUID, Hours> hoursByUser = aggregateHours(workspaceId, from, to);
        Map<UUID, LeaveUsage> leaveByUser = aggregateLeave(workspaceId, from, to);

        List<HrEmployeeSummaryResponse> employees = members.stream()
                .map(m -> {
                    User user = users.get(m.getUserId());
                    Hours hours = hoursByUser.getOrDefault(m.getUserId(), Hours.empty());
                    LeaveUsage leave = leaveByUser.getOrDefault(m.getUserId(), LeaveUsage.empty());
                    return toSummary(m, user, hours, leave);
                })
                .toList();

        return new HrOverviewResponse(from, to, employees);
    }

    private Map<UUID, Hours> aggregateHours(UUID workspaceId, LocalDate from, LocalDate to) {
        Map<UUID, Hours> result = new HashMap<>();
        for (TimeEntryRepository.UserStatusDuration row :
                timeEntryRepository.sumDurationByUserAndStatus(workspaceId, from, to)) {
            long total = row.getTotal() == null ? 0 : row.getTotal();
            long entries = row.getEntries() == null ? 0 : row.getEntries();
            Hours hours = result.computeIfAbsent(row.getUserId(), k -> new Hours());
            hours.totalMinutes += total;
            if (row.getStatus() == TimeEntryStatus.SUBMITTED) {
                hours.submittedMinutes += total;
                hours.pendingTimeEntries += entries;
            }
            if (row.getStatus() == TimeEntryStatus.APPROVED) {
                hours.approvedMinutes += total;
            }
        }
        return result;
    }

    private Map<UUID, LeaveUsage> aggregateLeave(UUID workspaceId, LocalDate from, LocalDate to) {
        Map<UUID, LeaveUsage> result = new HashMap<>();

        for (LeaveRequest request : leaveRequestRepository
                .findByWorkspaceIdAndStatusAndEndDateGreaterThanEqualAndStartDateLessThanEqual(
                        workspaceId, LeaveStatus.APPROVED, from, to)) {
            int days = overlapDays(request, from, to);
            LeaveUsage usage = result.computeIfAbsent(request.getUserId(), k -> new LeaveUsage());
            switch (request.getType()) {
                case VACATION -> usage.vacationDays += days;
                case SICK -> usage.sickDays += days;
                case PERSONAL -> usage.personalDays += days;
                case UNPAID -> usage.unpaidDays += days;
                case OTHER -> usage.otherDays += days;
            }
        }

        for (LeaveRequest pending : leaveRequestRepository.findByWorkspaceIdAndStatus(workspaceId, LeaveStatus.PENDING)) {
            LeaveUsage usage = result.computeIfAbsent(pending.getUserId(), k -> new LeaveUsage());
            usage.pendingLeaveRequests++;
        }
        return result;
    }

    private HrEmployeeSummaryResponse toSummary(WorkspaceMember member, User user, Hours hours, LeaveUsage leave) {
        String firstName = user != null ? user.getFirstName() : null;
        String lastName = user != null ? user.getLastName() : null;
        String username = user != null ? user.getUsername() : null;
        String avatarUrl = user != null ? user.getAvatarUrl() : null;
        return new HrEmployeeSummaryResponse(
                member.getUserId(),
                firstName,
                lastName,
                username,
                avatarUrl,
                member.getRole(),
                hours.totalMinutes,
                hours.submittedMinutes,
                hours.approvedMinutes,
                hours.pendingTimeEntries,
                leave.vacationDays,
                leave.sickDays,
                leave.personalDays,
                leave.unpaidDays,
                leave.otherDays,
                leave.pendingLeaveRequests);
    }

    private int overlapDays(LeaveRequest request, LocalDate from, LocalDate to) {
        LocalDate start = request.getStartDate().isAfter(from) ? request.getStartDate() : from;
        LocalDate end = request.getEndDate().isBefore(to) ? request.getEndDate() : to;
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        return (int) Math.max(days, 0);
    }

    private static final class Hours {
        long totalMinutes;
        long submittedMinutes;
        long approvedMinutes;
        long pendingTimeEntries;

        static Hours empty() {
            return new Hours();
        }
    }

    private static final class LeaveUsage {
        int vacationDays;
        int sickDays;
        int personalDays;
        int unpaidDays;
        int otherDays;
        long pendingLeaveRequests;

        static LeaveUsage empty() {
            return new LeaveUsage();
        }
    }
}
