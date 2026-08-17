import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AuthService } from '../../core/services/auth.service';
import { Workspace } from '../../core/models/workspace.model';
import { avatarColor, initials } from '../../shared/utils/avatar.util';

interface NavItem {
  route: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgFor, NgIf, MatListModule, MatIconModule],
  template: `
    <div class="sidebar">
      <div class="brand">
        <div class="brand-logo">C</div>
        <div class="brand-name">Collab</div>
        <span class="brand-version">v1</span>
      </div>

      <div class="section-label">Workspaces</div>
      <div class="workspaces">
        <button
          *ngFor="let ws of workspaces"
          class="workspace-item"
          [class.active]="isActiveWorkspace(ws.id)"
          (click)="openWorkspace(ws.id)"
          [title]="ws.name"
        >
          <span class="workspace-badge" [style.background]="avatarColor(ws.name)">{{ initials(ws.name) }}</span>
          <span class="workspace-name">{{ ws.name }}</span>
        </button>
        <button class="workspace-item muted" routerLink="/workspaces" title="Add workspace">
          <span class="workspace-badge add">+</span>
          <span class="workspace-name">Browse workspaces</span>
        </button>
      </div>

      <div class="section-label">Workspace</div>
      <nav>
        <a
          *ngFor="let item of navItems"
          class="nav-item"
          [routerLink]="item.route"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: false }"
        >
          <mat-icon>{{ item.icon }}</mat-icon>
          <span>{{ item.label }}</span>
        </a>
      </nav>

      <div class="section-label">HR &amp; Time</div>
      <nav>
        <a
          *ngFor="let item of hrNavItems"
          class="nav-item"
          [routerLink]="item.route"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: false }"
        >
          <mat-icon>{{ item.icon }}</mat-icon>
          <span>{{ item.label }}</span>
        </a>
      </nav>

      <ng-container *ngIf="isRootAdmin()">
        <div class="section-label">Administration</div>
        <nav>
          <a class="nav-item" routerLink="/backoffice" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }">
            <mat-icon>admin_panel_settings</mat-icon>
            <span>Backoffice</span>
          </a>
        </nav>
      </ng-container>

      <div class="sidebar-footer">
        <div class="user-row">
          <span class="avatar" [style.background]="avatarColor(displayName())">{{ initials(displayName()) }}</span>
          <div class="user-meta">
            <div class="user-name">{{ displayName() }}</div>
            <div class="user-status"><span class="status-dot online"></span> Online</div>
          </div>
          <button class="logout-btn" mat-icon-button (click)="logout()" title="Log out">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .sidebar {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: linear-gradient(180deg, var(--sidebar-bg) 0%, var(--sidebar-bg-2) 100%);
        color: var(--sidebar-text);
        overflow-y: auto;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 18px 16px 14px;
      }

      .brand-logo {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--primary), var(--blue));
        color: #fff;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: var(--shadow-sm);
      }

      .brand-name {
        font-weight: 700;
        font-size: 1.15rem;
        color: #fff;
        letter-spacing: -0.02em;
      }

      .brand-version {
        font-size: 0.65rem;
        background: rgba(255, 255, 255, 0.15);
        padding: 2px 6px;
        border-radius: 6px;
        color: var(--sidebar-text);
      }

      .section-label {
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 600;
        color: var(--sidebar-text);
        opacity: 0.75;
        padding: 14px 16px 6px;
      }

      .workspaces {
        padding: 0 8px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .workspace-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 8px;
        border: none;
        background: transparent;
        color: var(--sidebar-text);
        cursor: pointer;
        border-radius: 8px;
        font-family: inherit;
        text-align: left;
        transition: background 0.12s ease;
      }

      .workspace-item:hover {
        background: var(--sidebar-hover);
      }

      .workspace-item.active {
        background: var(--sidebar-active);
        color: #fff;
      }

      .workspace-item.muted {
        opacity: 0.75;
      }

      .workspace-badge {
        width: 28px;
        height: 28px;
        border-radius: 7px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.78rem;
        color: #fff;
        flex-shrink: 0;
        text-transform: uppercase;
      }

      .workspace-badge.add {
        background: rgba(255, 255, 255, 0.12);
        font-size: 1.1rem;
      }

      .workspace-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
        font-size: 0.9rem;
      }

      nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 0 8px;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 9px 10px;
        border-radius: 8px;
        color: var(--sidebar-text);
        font-weight: 500;
        font-size: 0.92rem;
        transition: background 0.12s ease, color 0.12s ease;
      }

      .nav-item mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .nav-item:hover {
        background: var(--sidebar-hover);
        color: #fff;
      }

      .nav-item.active {
        background: var(--sidebar-active);
        color: var(--sidebar-text-active);
        font-weight: 600;
      }

      .sidebar-footer {
        margin-top: auto;
        padding: 12px 12px 14px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .user-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .user-meta {
        flex: 1;
        min-width: 0;
      }

      .user-name {
        font-weight: 600;
        color: #fff;
        font-size: 0.9rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .user-status {
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        gap: 5px;
        color: var(--sidebar-text);
      }

      .logout-btn {
        color: var(--sidebar-text);
      }

      .logout-btn:hover {
        color: #fff;
      }
    `
  ]
})
export class SidebarComponent implements OnInit {
  private readonly workspaceService = inject(WorkspaceService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  workspaces: Workspace[] = [];
  readonly avatarColor = avatarColor;
  readonly initials = initials;

  navItems: NavItem[] = [
    { route: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { route: '/workspaces', icon: 'groups', label: 'Workspaces' },
    { route: '/notifications', icon: 'notifications', label: 'Notifications' },
    { route: '/profile', icon: 'settings', label: 'Settings & Profile' }
  ];

  hrNavItems: NavItem[] = [
    { route: '/timesheet', icon: 'schedule', label: 'Timesheet' },
    { route: '/leave', icon: 'event_available', label: 'Leave' },
    { route: '/hr', icon: 'badge', label: 'HR' }
  ];

  ngOnInit(): void {
    this.workspaceService.list().subscribe((ws) => (this.workspaces = ws));
  }

  displayName(): string {
    const user = this.auth.currentUser();
    if (!user) return 'User';
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username;
  }

  isActiveWorkspace(id: string): boolean {
    return this.router.url.includes(`/workspaces/${id}`);
  }

  isRootAdmin(): boolean {
    return this.auth.currentUser()?.role === 'ROOT_ADMIN';
  }

  openWorkspace(id: string): void {
    void this.router.navigate(['/workspaces', id]);
  }

  logout(): void {
    this.auth.logout().subscribe(() => void this.router.navigate(['/login']));
  }
}
