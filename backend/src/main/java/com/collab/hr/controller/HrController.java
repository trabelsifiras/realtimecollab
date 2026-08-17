package com.collab.hr.controller;

import com.collab.common.security.SecurityUtils;
import com.collab.hr.dto.HrOverviewResponse;
import com.collab.hr.service.HrReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "HR")
public class HrController {

    private final HrReportService hrReportService;

    public HrController(HrReportService hrReportService) {
        this.hrReportService = hrReportService;
    }

    @GetMapping("/workspaces/{workspaceId}/hr/overview")
    @Operation(summary = "Employee hours & leave overview (HR only)")
    public ResponseEntity<HrOverviewResponse> overview(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate end = to != null ? to : LocalDate.now();
        return ResponseEntity.ok(hrReportService.overview(workspaceId, SecurityUtils.currentUserId(), start, end));
    }
}
