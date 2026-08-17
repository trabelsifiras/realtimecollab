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
  template: `
    <div class="page-container timesheet">
      <header class="header">
        <div>
          <h1>Timesheet</h1>
          <p class="subtitle">Log your working hours on the calendar.</p>
        </div>
        <app-workspace-picker [workspaceId]="workspaceId" (workspaceChange)="onWorkspaceChange($event)"></app-workspace-picker>
      </header>

      <ng-container *ngIf="workspaceId">
        <div class="toolbar">
          <div class="month-nav">
            <button mat-icon-button (click)="prevMonth()" aria-label="Previous month"><mat-icon>chevron_left</mat-icon></button>
            <button mat-button (click)="goToday()">Today</button>
            <button mat-icon-button (click)="nextMonth()" aria-label="Next month"><mat-icon>chevron_right</mat-icon></button>
            <span class="month-label" aria-live="polite">{{ monthStart | date: 'MMMM yyyy' }}</span>
          </div>
          <div class="summary">
            <span class="sum-total"><mat-icon>schedule</mat-icon> {{ minutesToLabel(monthTotal()) }}</span>
            <span class="sum-item">Submitted {{ minutesToLabel(submittedTotal()) }}</span>
            <span class="sum-item">Approved {{ minutesToLabel(approvedTotal()) }}</span>
          </div>
        </div>

        <div class="calendar-scroll">
          <div class="calendar" role="group" aria-label="Monthly calendar">
            <div class="weekday-row">
              <span *ngFor="let w of WEEKDAYS" class="weekday">{{ w }}</span>
            </div>
            <div class="month-grid">
              <div
                *ngFor="let day of cells(); let i = index"
                class="day-cell"
                [class.outside]="!inMonth(day)"
                [class.today]="isToday(day)"
                role="group"
                [attr.aria-label]="WEEKDAYS_FULL[i % 7] + ' ' + (day | date: 'longDate')"
              >
                <div class="day-top">
                  <button class="day-num" (click)="openAdd(day)" [attr.aria-label]="'Add time for ' + WEEKDAYS_FULL[i % 7] + ' ' + (day | date: 'longDate')">
                    {{ day | date: 'd' }}
                  </button>
                  <span *ngIf="totalForDay(day)" class="day-total">{{ minutesToLabel(totalForDay(day)) }}</span>
                  <button *ngIf="!totalForDay(day)" class="day-add" (click)="openAdd(day)" [attr.aria-label]="'Add time for ' + WEEKDAYS_FULL[i % 7] + ' ' + (day | date: 'longDate')">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
                <div class="day-entries">
                  <button
                    *ngFor="let e of entriesForDay(day)"
                    class="entry-chip"
                    [matTooltip]="entryTooltip(e)"
                    (click)="openEntry(e)"
                    [attr.aria-label]="entryLabel(e)"
                  >
                    <span class="chip-dot" [style.background]="TIME_ENTRY_STATUS_COLORS[e.status]"></span>
                    <span class="chip-text">{{ e.projectName ?? 'Project' }} · {{ minutesToLabel(e.durationMinutes) }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section class="list" aria-labelledby="entries-title">
          <h2 id="entries-title">Entries this month <span class="count">{{ entries.length }}</span></h2>
          <div *ngIf="loading" class="loading"><mat-spinner diameter="28"></mat-spinner></div>
          <ul *ngIf="!loading" class="entry-list">
            <li *ngFor="let e of sortedEntries()" class="entry-row">
              <div class="entry-date">
                <div class="d">{{ e.entryDate | date: 'EEE' }}</div>
                <div class="n">{{ e.entryDate | date: 'd' }}</div>
              </div>
              <div class="entry-main">
                <div class="entry-title"><strong>{{ e.projectName ?? 'Project' }}</strong><span *ngIf="e.taskTitle" class="task-ref">{{ e.taskTitle }}</span></div>
                <div class="entry-desc">{{ e.description ?? '' }}</div>
              </div>
              <div class="entry-hours">{{ minutesToLabel(e.durationMinutes) }}</div>
              <span class="status-pill" [style.background]="TIME_ENTRY_STATUS_COLORS[e.status] + '22'" [style.color]="TIME_ENTRY_STATUS_COLORS[e.status]">{{ TIME_ENTRY_STATUS_LABELS[e.status] }}</span>
              <div class="entry-actions" *ngIf="e.status === 'DRAFT'">
                <button mat-icon-button (click)="openEntry(e)" aria-label="Edit entry"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button (click)="submit(e)" aria-label="Submit for approval"><mat-icon>check_circle_outline</mat-icon></button>
                <button mat-icon-button class="danger" (click)="remove(e)" aria-label="Delete entry"><mat-icon>delete_outline</mat-icon></button>
              </div>
            </li>
            <li *ngIf="entries.length === 0" class="no-entries">No entries this month. Click a day on the calendar to log time.</li>
          </ul>
        </section>
      </ng-container>

      <div *ngIf="!workspaceId" class="empty-state">You don't have any workspaces yet.</div>
    </div>
  `,
  styles: [
    `
      .timesheet { max-width: 1180px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
      .header h1 { margin: 0; }
      .subtitle { margin: 4px 0 0; color: var(--text-muted); font-size: 0.9rem; }

      .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
      .month-nav { display: flex; align-items: center; gap: 4px; }
      .month-label { font-weight: 700; font-size: 1rem; margin-left: 8px; }
      .summary { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
      .sum-total { display: inline-flex; align-items: center; gap: 6px; font-weight: 800; color: var(--text); }
      .sum-total mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary); }
      .sum-item { font-size: 0.82rem; color: var(--text-muted); font-weight: 600; }

      .calendar-scroll { overflow-x: auto; padding-bottom: 4px; }
      .calendar {
        min-width: 680px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }
      .weekday-row {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        border-bottom: 1px solid var(--border);
        background: var(--surface-2);
      }
      .weekday {
        padding: 10px 8px;
        text-align: center;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-faint);
      }
      .month-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
      .day-cell {
        min-height: 108px;
        border-right: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        padding: 6px;
        background: var(--surface);
      }
      .day-cell.outside { background: var(--surface-2); }
      .day-cell.today { box-shadow: inset 0 0 0 2px var(--primary); }
      .day-top { display: flex; align-items: center; gap: 4px; min-height: 24px; }
      .day-num {
        all: unset;
        cursor: pointer;
        font-weight: 700;
        font-size: 0.85rem;
        min-width: 22px;
        height: 22px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--text);
      }
      .day-num:hover { background: var(--primary); color: #fff; }
      .day-cell.today .day-num { background: var(--primary); color: #fff; }
      .day-cell.outside .day-num { color: var(--text-faint); }
      .day-total { font-size: 0.72rem; font-weight: 700; color: var(--primary); margin-left: 4px; }
      .day-add { margin-left: auto; width: 22px; height: 22px; line-height: 22px; color: var(--text-faint); }
      .day-add mat-icon { font-size: 15px; width: 15px; height: 15px; }
      .day-cell:hover .day-add { color: var(--primary); }

      .day-entries { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
      .entry-chip {
        all: unset;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        background: #eef0fd;
        border-radius: 5px;
        padding: 2px 6px;
        font-size: 0.7rem;
        font-weight: 600;
        color: #4a3fd0;
      }
      .entry-chip:hover { background: #dfe1fb; }
      .chip-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
      .chip-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

      .list h2 { display: flex; align-items: center; gap: 8px; font-size: 1rem; margin: 20px 0 12px; }
      .count { background: var(--surface-2); border-radius: 10px; padding: 1px 8px; font-size: 0.72rem; font-weight: 600; color: var(--text-muted); }
      .loading { display: flex; justify-content: center; padding: 24px; }

      .entry-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .entry-row { display: flex; align-items: center; gap: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 16px; }
      .entry-date { text-align: center; min-width: 40px; }
      .entry-date .d { font-size: 0.68rem; color: var(--text-faint); text-transform: uppercase; }
      .entry-date .n { font-size: 1.1rem; font-weight: 700; }
      .entry-main { flex: 1; min-width: 0; }
      .entry-title { display: flex; gap: 8px; align-items: center; }
      .task-ref { font-size: 0.78rem; color: var(--text-faint); }
      .entry-desc { font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .entry-hours { font-weight: 700; }
      .status-pill { font-size: 0.7rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
      .entry-actions { display: flex; gap: 2px; }
      .entry-actions .danger { color: var(--text-faint); }
      .entry-actions .danger:hover { color: var(--danger); }
      .no-entries { color: var(--text-faint); padding: 16px; text-align: center; }

      @media (max-width: 760px) {
        .entry-row { flex-wrap: wrap; }
      }
    `
  ]
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
