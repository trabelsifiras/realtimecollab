import { Component, inject } from '@angular/core';
import { DatePipe, NgFor, NgIf, NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { HrService } from '../../core/services/hr.service';
import { ProjectService } from '../../core/services/project.service';
import { Project } from '../../core/models/project.model';
import { TimeEntry } from '../../core/models/hr.model';
import { WorkspacePickerComponent } from './workspace-picker.component';
import { LogTimeDialogComponent } from './log-time-dialog.component';
import { addDays, isSameDay, minutesToLabel, startOfWeek, toISODate } from '../../shared/utils/date.util';
import { TIME_ENTRY_STATUS_COLORS, TIME_ENTRY_STATUS_LABELS } from './hr.constants';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

@Component({
  selector: 'app-timesheet',
  standalone: true,
  imports: [
    DatePipe,
    NgFor,
    NgIf,
    NgClass,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    WorkspacePickerComponent
  ],
  templateUrl: './timesheet.component.html',
  styleUrl: './timesheet.component.css'
})
export class TimesheetComponent {
  private readonly hrService = inject(HrService);
  private readonly projectService = inject(ProjectService);
  private readonly dialog = inject(MatDialog);

  readonly TIME_ENTRY_STATUS_COLORS = TIME_ENTRY_STATUS_COLORS;
  readonly TIME_ENTRY_STATUS_LABELS = TIME_ENTRY_STATUS_LABELS;
  readonly WEEKDAYS = WEEKDAYS;
  readonly WEEKDAYS_FULL = WEEKDAYS_FULL;
  readonly minutesToLabel = minutesToLabel;

  workspaceId: string | null = null;
  projects: Project[] = [];
  entries: TimeEntry[] = [];
  monthStart: Date = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  loading = false;

  onWorkspaceChange(id: string): void {
    this.workspaceId = id;
    this.projectService.list(id).subscribe((projects) => (this.projects = projects));
    this.load();
  }

  load(): void {
    if (!this.workspaceId) return;
    this.loading = true;
    const from = toISODate(this.monthStart);
    const to = toISODate(new Date(this.monthStart.getFullYear(), this.monthStart.getMonth() + 1, 0));
    this.hrService.listMyTimeEntries(this.workspaceId, { from, to }).subscribe({
      next: (entries) => {
        this.entries = entries;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  cells(): Date[] {
    const gridStart = startOfWeek(this.monthStart);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }

  inMonth(day: Date): boolean {
    return day.getMonth() === this.monthStart.getMonth() && day.getFullYear() === this.monthStart.getFullYear();
  }

  isToday(day: Date): boolean {
    return isSameDay(day, new Date());
  }

  entriesForDay(day: Date): TimeEntry[] {
    const iso = toISODate(day);
    return this.entries.filter((e) => e.entryDate === iso);
  }

  totalForDay(day: Date): number {
    return this.entriesForDay(day).reduce((sum, e) => sum + e.durationMinutes, 0);
  }

  monthTotal(): number {
    return this.entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  }

  submittedTotal(): number {
    return this.entries.filter((e) => e.status === 'SUBMITTED').reduce((sum, e) => sum + e.durationMinutes, 0);
  }

  approvedTotal(): number {
    return this.entries.filter((e) => e.status === 'APPROVED').reduce((sum, e) => sum + e.durationMinutes, 0);
  }

  sortedEntries(): TimeEntry[] {
    return [...this.entries].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  }

  entryTooltip(entry: TimeEntry): string {
    return `${entry.projectName ?? 'Project'} · ${minutesToLabel(entry.durationMinutes)} · ${TIME_ENTRY_STATUS_LABELS[entry.status]}`;
  }

  entryLabel(entry: TimeEntry): string {
    return `${TIME_ENTRY_STATUS_LABELS[entry.status]} entry: ${entry.projectName ?? 'Project'}, ${minutesToLabel(entry.durationMinutes)}`;
  }

  prevMonth(): void {
    this.monthStart = new Date(this.monthStart.getFullYear(), this.monthStart.getMonth() - 1, 1);
    this.load();
  }

  nextMonth(): void {
    this.monthStart = new Date(this.monthStart.getFullYear(), this.monthStart.getMonth() + 1, 1);
    this.load();
  }

  goToday(): void {
    this.monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    this.load();
  }

  openAdd(day: Date): void {
    this.openDialog(toISODate(day));
  }

  openEntry(entry: TimeEntry): void {
    this.openDialog(undefined, entry);
  }

  private openDialog(date?: string, entry?: TimeEntry): void {
    const ref = this.dialog.open(LogTimeDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: { workspaceId: this.workspaceId!, projects: this.projects, date, entry }
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.entry || result?.deleted) this.load();
    });
  }

  submit(entry: TimeEntry): void {
    this.hrService.submitTimeEntry(entry.id).subscribe(() => this.load());
  }

  remove(entry: TimeEntry): void {
    this.hrService.deleteTimeEntry(entry.id).subscribe(() => this.load());
  }
}
