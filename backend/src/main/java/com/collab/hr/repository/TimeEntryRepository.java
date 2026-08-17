package com.collab.hr.repository;

import com.collab.hr.domain.TimeEntry;
import com.collab.hr.domain.TimeEntryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TimeEntryRepository extends JpaRepository<TimeEntry, UUID>, JpaSpecificationExecutor<TimeEntry> {

    /**
     * Aggregates total minutes and entry count per user and status within a
     * date range, used to build the HR dashboard.
     */
    @Query("select e.userId as userId, e.status as status, " +
            "coalesce(sum(e.durationMinutes), 0) as total, count(e) as entries " +
            "from TimeEntry e " +
            "where e.workspaceId = :workspaceId and e.entryDate between :from and :to " +
            "group by e.userId, e.status")
    List<UserStatusDuration> sumDurationByUserAndStatus(@Param("workspaceId") UUID workspaceId,
                                                        @Param("from") LocalDate from,
                                                        @Param("to") LocalDate to);

    interface UserStatusDuration {
        UUID getUserId();

        TimeEntryStatus getStatus();

        Long getTotal();

        Long getEntries();
    }
}
