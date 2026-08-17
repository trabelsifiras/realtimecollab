import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { NotificationService } from '../../core/services/notification.service';
import { Workspace } from '../../core/models/workspace.model';
import { avatarColor, initials } from '../../shared/utils/avatar.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="welcome">
        <div>
          <h1>Good {{ greeting() }}, {{ firstName() }} 👋</h1>
          <p class="text-muted">Here's what's happening across your workspaces.</p>
        </div>
        <button mat-raised-button color="primary" routerLink="/workspaces">
          <mat-icon>add</mat-icon> New workspace
        </button>
      </div>

      <div class="stats">
        <div class="stat-card">
          <div class="stat-icon purple"><mat-icon>workspaces</mat-icon></div>
          <div>
            <div class="stat-value">{{ workspaces.length }}</div>
            <div class="stat-label">Workspaces</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><mat-icon>notifications</mat-icon></div>
          <div>
            <div class="stat-value">{{ notification.unreadCount() }}</div>
            <div class="stat-label">Unread alerts</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><mat-icon>bolt</mat-icon></div>
          <div>
            <div class="stat-value">Live</div>
            <div class="stat-label">Realtime sync</div>
          </div>
        </div>
      </div>

      <h2>Your workspaces</h2>
      <div class="card-grid">
        <div *ngFor="let ws of workspaces" class="workspace-card clickable-card" (click)="open(ws.id)">
          <span class="workspace-badge" [style.background]="avatarColor(ws.name)">{{ initials(ws.name) }}</span>
          <div class="ws-body">
            <div class="ws-name">{{ ws.name }}</div>
            <div class="ws-desc">{{ ws.description ?? 'No description' }}</div>
          </div>
          <mat-icon class="ws-arrow">chevron_right</mat-icon>
        </div>
      </div>

      <div *ngIf="workspaces.length === 0" class="empty-card">
        <mat-icon>rocket_launch</mat-icon>
        <p>You're not part of a workspace yet.</p>
        <button mat-raised-button color="primary" routerLink="/workspaces">Create your first workspace</button>
      </div>
    </div>
  `,
  styles: [
    `
      .welcome {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 24px;
      }

      .welcome h1 {
        margin: 0 0 6px;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 8px;
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 16px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 20px;
        box-shadow: var(--shadow-xs);
      }

      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }

      .stat-icon.purple { background: var(--primary); }
      .stat-icon.green { background: var(--accent); }
      .stat-icon.blue { background: var(--blue); }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 800;
        line-height: 1.1;
      }

      .stat-label {
        font-size: 0.82rem;
        color: var(--text-muted);
      }

      .workspace-card {
        display: flex;
        align-items: center;
        gap: 14px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 18px;
      }

      .workspace-badge {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        color: #fff;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        text-transform: uppercase;
      }

      .ws-body {
        flex: 1;
        min-width: 0;
      }

      .ws-name {
        font-weight: 700;
      }

      .ws-desc {
        font-size: 0.85rem;
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ws-arrow {
        color: var(--text-faint);
      }

      .empty-card {
        text-align: center;
        background: var(--surface);
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius-lg);
        padding: 56px;
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
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly workspaceService = inject(WorkspaceService);
  readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  readonly avatarColor = avatarColor;
  readonly initials = initials;

  workspaces: Workspace[] = [];

  ngOnInit(): void {
    this.workspaceService.list().subscribe((ws) => (this.workspaces = ws));
    this.notification.refreshUnreadCount().subscribe();
  }

  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  firstName(): string {
    const user = this.auth.currentUser();
    return user?.firstName ?? user?.username ?? 'there';
  }

  open(id: string): void {
    void this.router.navigate(['/workspaces', id]);
  }
}
