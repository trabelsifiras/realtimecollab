package com.collab.hr.dto;

import java.time.LocalDate;
import java.util.List;

public record HrOverviewResponse(
        LocalDate from,
        LocalDate to,
        List<HrEmployeeSummaryResponse> employees) {
}
