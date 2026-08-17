import { Component, Input, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ProjectService } from '../../core/services/project.service';
import { Project, ProjectStatus } from '../../core/models/project.model';
import { avatarColor, initials } from '../../shared/utils/avatar.util';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNING: '#6b778c',
  ACTIVE: '#00875a',
  ON_HOLD: '#ecb22e',
  COMPLETED: '#36c5f0',
  ARCHIVED: '#9b9b9b'
};

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgFor, NgIf, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatSelectModule],
  template: `
    <div class="page-container">
      <button mat-button class="back" routerLink="/workspaces/{{ workspaceId }}">
        <mat-icon>arrow_back</mat-icon> Workspace
      </button>

      <div class="header">
        <h1>Projects</h1>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>{{ showForm ? 'close' : 'add' }}</mat-icon> New project
        </button>
      </div>

      <div *ngIf="showForm" class="form-card">
        <form [formGroup]="form" (ngSubmit)="create()">
          <div class="row">
            <mat-form-field class="grow" appearance="outline">
              <mat-label>Project name</mat-label>
              <input matInput formControlName="name" placeholder="e.g. Website redesign" />
            </mat-form-field>
            <mat-form-field class="key" appearance="outline">
              <mat-label>Key</mat-label>
              <input matInput formControlName="key" placeholder="WEB" />
            </mat-form-field>
          </div>
          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option *ngFor="let s of statuses" [value]="s">{{ s }}</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">Create project</button>
        </form>
      </div>

      <div class="card-grid">
        <div *ngFor="let p of projects" class="project-card clickable-card" (click)="open(p.id)">
          <div class="p-top">
            <span class="p-badge" [style.background]="avatarColor(p.name)">{{ initials(p.name) }}</span>
            <span class="status-pill" [style.background]="statusColor(p.status) + '22'" [style.color]="statusColor(p.status)">
              {{ p.status }}
            </span>
          </div>
          <div class="p-name">{{ p.name }}</div>
          <div class="p-key" *ngIf="p.key">{{ p.key }}</div>
          <div class="p-desc">{{ p.description ?? 'No description' }}</div>
          <button mat-button class="open-board" (click)="$event.stopPropagation(); open(p.id)">
            Open board <mat-icon>arrow_forward</mat-icon>
          </button>
        </div>
      </div>

      <div *ngIf="projects.length === 0 && !showForm" class="empty-card">
        <mat-icon>dashboard</mat-icon>
        <p>No projects yet. Create one to start planning.</p>
      </div>
    </div>
  `,
  styles: [
    `
      .back {
        color: var(--text-muted);
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .header h1 {
        margin: 0;
      }
      .form-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 20px;
        margin-bottom: 24px;
        max-width: 560px;
        box-shadow: var(--shadow-xs);
      }
      .row {
        display: flex;
        gap: 12px;
      }
      .grow {
        flex: 1;
      }
      .key {
        width: 120px;
      }
      .project-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .p-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .p-badge {
        width: 40px;
        height: 40px;
        border-radius: 11px;
        color: #fff;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        text-transform: uppercase;
      }
      .status-pill {
        font-size: 0.68rem;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 20px;
        letter-spacing: 0.03em;
      }
      .p-name {
        font-weight: 700;
        font-size: 1.05rem;
      }
      .p-key {
        font-size: 0.72rem;
        color: var(--text-faint);
        font-weight: 600;
      }
      .p-desc {
        color: var(--text-muted);
        font-size: 0.88rem;
        min-height: 40px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .open-board {
        align-self: flex-start;
        color: var(--primary);
        font-weight: 600;
        padding-left: 0;
      }
      .empty-card {
        text-align: center;
        background: var(--surface);
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius-lg);
        padding: 64px;
        color: var(--text-muted);
      }
      .empty-card mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--text-faint);
      }
    `
  ]
})
export class ProjectsComponent implements OnInit {
  @Input() workspaceId!: string;

  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);

  readonly avatarColor = avatarColor;
  readonly initials = initials;

  projects: Project[] = [];
  statuses: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];
  showForm = false;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    key: [''],
    status: ['ACTIVE' as ProjectStatus]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.projectService.list(this.workspaceId).subscribe((projects) => (this.projects = projects));
  }

  create(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.projectService.create(this.workspaceId, { name: value.name, key: value.key || undefined, status: value.status }).subscribe(() => {
      this.showForm = false;
      this.form.reset({ status: 'ACTIVE' });
      this.load();
    });
  }

  statusColor(status: ProjectStatus): string {
    return STATUS_COLORS[status];
  }

  open(id: string): void {
    void this.router.navigate(['/projects', id]);
  }
}
