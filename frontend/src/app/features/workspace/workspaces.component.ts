import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Workspace } from '../../core/models/workspace.model';
import { avatarColor, initials } from '../../shared/utils/avatar.util';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [ReactiveFormsModule, NgFor, NgIf, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="header">
        <h1>Workspaces</h1>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>{{ showForm ? 'close' : 'add' }}</mat-icon> New workspace
        </button>
      </div>

      <div *ngIf="showForm" class="form-card">
        <form [formGroup]="form" (ngSubmit)="create()">
          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Workspace name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. Acme Corp" />
          </mat-form-field>
          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="2" placeholder="What's this workspace for?"></textarea>
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">Create workspace</button>
        </form>
      </div>

      <div class="card-grid">
        <div *ngFor="let ws of workspaces" class="workspace-card clickable-card" (click)="open(ws.id)">
          <div class="ws-top">
            <span class="workspace-badge" [style.background]="avatarColor(ws.name)">{{ initials(ws.name) }}</span>
            <span class="ws-slug">{{ ws.slug }}</span>
          </div>
          <div class="ws-name">{{ ws.name }}</div>
          <div class="ws-desc">{{ ws.description ?? 'No description yet.' }}</div>
          <div class="ws-actions">
            <button mat-button class="action" (click)="$event.stopPropagation(); openProjects(ws.id)">
              <mat-icon>view_kanban</mat-icon> Projects
            </button>
            <button mat-button class="action" (click)="$event.stopPropagation(); openChannels(ws.id)">
              <mat-icon>tag</mat-icon> Channels
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="workspaces.length === 0 && !showForm" class="empty-card">
        <mat-icon>workspaces</mat-icon>
        <p>No workspaces yet. Create one to start collaborating.</p>
      </div>
    </div>
  `,
  styles: [
    `
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
        max-width: 520px;
        box-shadow: var(--shadow-xs);
        animation: fadeUp 0.2s ease;
      }

      .workspace-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .ws-top {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .workspace-badge {
        width: 42px;
        height: 42px;
        border-radius: 11px;
        color: #fff;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        text-transform: uppercase;
      }

      .ws-slug {
        font-size: 0.72rem;
        color: var(--text-faint);
        background: var(--surface-2);
        border: 1px solid var(--border);
        padding: 2px 8px;
        border-radius: 6px;
      }

      .ws-name {
        font-weight: 700;
        font-size: 1.05rem;
      }

      .ws-desc {
        color: var(--text-muted);
        font-size: 0.88rem;
        min-height: 40px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .ws-actions {
        display: flex;
        gap: 4px;
        border-top: 1px solid var(--border);
        padding-top: 10px;
        margin-top: 4px;
      }

      .action {
        color: var(--text-muted);
        font-size: 0.82rem;
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
export class WorkspacesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly router = inject(Router);

  readonly avatarColor = avatarColor;
  readonly initials = initials;

  workspaces: Workspace[] = [];
  showForm = false;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.workspaceService.list().subscribe((ws) => (this.workspaces = ws));
  }

  create(): void {
    if (this.form.invalid) return;
    this.workspaceService.create(this.form.getRawValue()).subscribe((ws) => {
      this.showForm = false;
      this.form.reset();
      void this.router.navigate(['/workspaces', ws.id]);
    });
  }

  open(id: string): void {
    void this.router.navigate(['/workspaces', id]);
  }

  openProjects(id: string): void {
    void this.router.navigate(['/workspaces', id, 'projects']);
  }

  openChannels(id: string): void {
    void this.router.navigate(['/workspaces', id, 'channels']);
  }
}
