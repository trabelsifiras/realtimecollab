import { Component, Input, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { WorkspaceService } from '../../core/services/workspace.service';
import { UserService } from '../../core/services/user.service';
import { Workspace, WorkspaceMember, WorkspaceRole } from '../../core/models/workspace.model';
import { User } from '../../core/models/user.model';
import { avatarColor, initials } from '../../shared/utils/avatar.util';

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  OWNER: '#e01e5a',
  ADMIN: '#6c5ce7',
  HR: '#ecb22e',
  MEMBER: '#36c5f0',
  GUEST: '#9b9b9b'
};

@Component({
  selector: 'app-workspace-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    NgFor,
    NgIf,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <div class="page-container">
      <button mat-button class="back" routerLink="/workspaces"><mat-icon>arrow_back</mat-icon> Workspaces</button>

      <div *ngIf="workspace" class="info-card">
        <span class="ws-badge" [style.background]="avatarColor(workspace.name)">{{ initials(workspace.name) }}</span>
        <div class="ws-info">
          <h1>{{ workspace.name }}</h1>
          <div class="slug">{{ workspace.slug }}</div>
          <p class="desc">{{ workspace.description ?? 'No description' }}</p>
          <div class="actions">
            <button mat-raised-button color="primary" (click)="openProjects()">
              <mat-icon>view_kanban</mat-icon> Projects
            </button>
            <button mat-button (click)="openChannels()"><mat-icon>tag</mat-icon> Channels</button>
          </div>
        </div>
      </div>

      <div class="section-header">
        <h2>Members</h2>
        <span class="count">{{ members.length }}</span>
      </div>

      <div class="add-member">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Add member by email or username</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="searchQuery" (keyup)="searchUsers()" />
        </mat-form-field>
        <div *ngIf="searchResults.length" class="search-results">
          <div *ngFor="let u of searchResults" class="search-item" (click)="addMember(u)">
            <span class="avatar" [style.background]="avatarColor(u.username)">{{ initials(u.username) }}</span>
            <div class="search-meta">
              <div class="search-name">{{ u.username }}</div>
              <div class="search-email">{{ u.email }}</div>
            </div>
            <mat-icon class="add-icon">person_add</mat-icon>
          </div>
        </div>
      </div>

      <div class="member-list">
        <div *ngFor="let m of members" class="member-row">
          <span class="avatar" [style.background]="avatarColor(m.user?.username ?? m.userId)">
            {{ initials(m.user?.username ?? m.userId) }}
          </span>
          <div class="member-meta">
            <div class="member-name">{{ m.user?.username ?? 'Unknown' }}</div>
            <div class="member-email">{{ m.user?.email ?? '' }}</div>
          </div>
          <span class="role-pill" [style.background]="roleColor(m.role) + '22'" [style.color]="roleColor(m.role)">{{ m.role }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .back {
        color: var(--text-muted);
      }
      .info-card {
        display: flex;
        gap: 20px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 24px;
        margin: 8px 0 24px;
        box-shadow: var(--shadow-xs);
      }
      .ws-badge {
        width: 64px;
        height: 64px;
        border-radius: 16px;
        color: #fff;
        font-weight: 700;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        text-transform: uppercase;
      }
      .ws-info {
        flex: 1;
      }
      .ws-info h1 {
        margin: 0;
      }
      .slug {
        font-size: 0.78rem;
        color: var(--text-faint);
        margin-top: 2px;
      }
      .desc {
        color: var(--text-muted);
        margin: 10px 0 16px;
      }
      .actions {
        display: flex;
        gap: 8px;
      }
      .section-header {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .section-header h2 {
        margin: 0 0 12px;
      }
      .count {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 1px 10px;
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--text-muted);
        margin-bottom: 12px;
      }
      .add-member {
        margin-bottom: 20px;
        max-width: 480px;
        position: relative;
      }
      .search-field {
        width: 100%;
      }
      .search-results {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        z-index: 5;
        overflow: hidden;
      }
      .search-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        cursor: pointer;
      }
      .search-item:hover {
        background: var(--surface-2);
      }
      .search-meta {
        flex: 1;
      }
      .search-name {
        font-weight: 600;
        font-size: 0.9rem;
      }
      .search-email {
        font-size: 0.78rem;
        color: var(--text-faint);
      }
      .add-icon {
        color: var(--primary);
      }
      .member-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .member-row {
        display: flex;
        align-items: center;
        gap: 14px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 10px 16px;
      }
      .member-meta {
        flex: 1;
        min-width: 0;
      }
      .member-name {
        font-weight: 600;
      }
      .member-email {
        font-size: 0.78rem;
        color: var(--text-faint);
      }
      .role-pill {
        font-size: 0.7rem;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 20px;
      }
      .role-select {
        width: 130px;
      }
      .remove {
        color: var(--text-faint);
      }
      .remove:hover {
        color: var(--danger);
      }
    `
  ]
})
export class WorkspaceDetailComponent implements OnInit {
  @Input() workspaceId!: string;

  private readonly workspaceService = inject(WorkspaceService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly avatarColor = avatarColor;
  readonly initials = initials;

  workspace: Workspace | null = null;
  members: WorkspaceMember[] = [];
  searchQuery = '';
  searchResults: User[] = [];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.workspaceService.get(this.workspaceId).subscribe((ws) => (this.workspace = ws));
    this.workspaceService.listMembers(this.workspaceId).subscribe((members) => (this.members = members));
  }

  roleColor(role: WorkspaceRole): string {
    return ROLE_COLORS[role];
  }

  openProjects(): void {
    void this.router.navigate(['/workspaces', this.workspaceId, 'projects']);
  }

  openChannels(): void {
    void this.router.navigate(['/workspaces', this.workspaceId, 'channels']);
  }

  searchUsers(): void {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }
    this.userService.search(this.searchQuery.trim()).subscribe((users) => (this.searchResults = users));
  }

  addMember(user: User): void {
    this.workspaceService.addMember(this.workspaceId, user.id).subscribe(() => {
      this.searchResults = [];
      this.searchQuery = '';
      this.load();
    });
  }
}
