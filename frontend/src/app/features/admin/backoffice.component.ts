import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { User, UserRole } from '../../core/models/user.model';
import { Workspace, WorkspaceMember, WorkspaceRole } from '../../core/models/workspace.model';
import { avatarColor, initials } from '../../shared/utils/avatar.util';

const WORKSPACE_ROLES: WorkspaceRole[] = ['OWNER', 'ADMIN', 'HR', 'MEMBER', 'GUEST'];

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  OWNER: '#e01e5a',
  ADMIN: '#6c5ce7',
  HR: '#ecb22e',
  MEMBER: '#36c5f0',
  GUEST: '#9b9b9b'
};

@Component({
  selector: 'app-backoffice',
  standalone: true,
  imports: [
    FormsModule,
    NgFor,
    NgIf,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-container backoffice">
      <header class="header">
        <div>
          <h1>Backoffice</h1>
          <p class="subtitle">User management and role assignment.</p>
        </div>
        <span *ngIf="isRootAdmin" class="admin-badge"><mat-icon>verified_user</mat-icon> Root admin</span>
      </header>

      <div *ngIf="!isRootAdmin" class="forbidden" role="alert">
        <mat-icon>lock</mat-icon>
        <p>Only the root administrator can access the backoffice.</p>
      </div>

      <mat-tab-group *ngIf="isRootAdmin" animationDuration="0ms">
        <mat-tab label="Users">
          <div class="tab-body">
            <mat-form-field appearance="outline" class="search">
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="search" (ngModelChange)="loadUsers()" placeholder="Search users…" aria-label="Search users" />
            </mat-form-field>

            <ul class="user-list">
              <li *ngFor="let u of users" class="user-row">
                <span class="avatar" [style.background]="avatarColor(u.username)">{{ initials(u.username) }}</span>
                <div class="user-main">
                  <div class="user-name">
                    {{ displayName(u) }}
                    <span *ngIf="isSelf(u)" class="you-badge">You</span>
                    <span *ngIf="u.role === 'ROOT_ADMIN'" class="role-pill admin">{{ u.role }}</span>
                  </div>
                  <div class="user-email">{{ u.email }} · joined {{ u.createdAt | date: 'mediumDate' }}</div>
                </div>
                <span *ngIf="u.active === false" class="status-pill suspended">Suspended</span>
                <span *ngIf="u.active !== false" class="status-pill active">Active</span>

                <div class="user-actions" *ngIf="!isSelf(u)">
                  <button *ngIf="u.role !== 'ROOT_ADMIN'" mat-button color="primary" (click)="promote(u)">Make admin</button>
                  <button *ngIf="u.role === 'ROOT_ADMIN'" mat-button (click)="demote(u)">Revoke admin</button>
                  <button *ngIf="u.active !== false" mat-button color="warn" (click)="deactivate(u)">Suspend</button>
                  <button *ngIf="u.active === false" mat-button color="primary" (click)="reactivate(u)">Reactivate</button>
                </div>
              </li>
              <li *ngIf="users.length === 0" class="empty">No users found.</li>
            </ul>
          </div>
        </mat-tab>

        <mat-tab label="Workspaces">
          <div class="tab-body">
            <ul class="ws-list">
              <li *ngFor="let ws of workspaces" class="ws-item">
                <button class="ws-toggle" (click)="toggleWorkspace(ws)" [attr.aria-expanded]="expandedWorkspaceId === ws.id">
                  <span class="ws-badge" [style.background]="avatarColor(ws.name)">{{ initials(ws.name) }}</span>
                  <span class="ws-name">{{ ws.name }}</span>
                  <span class="ws-slug">{{ ws.slug }}</span>
                  <mat-icon>{{ expandedWorkspaceId === ws.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>

                <div *ngIf="expandedWorkspaceId === ws.id" class="members">
                  <div *ngFor="let m of members" class="member-row">
                    <span class="avatar" [style.background]="avatarColor(m.user?.username ?? m.userId)">{{ initials(m.user?.username ?? m.userId) }}</span>
                    <div class="member-main">
                      <div class="member-name">{{ m.user?.username ?? 'Unknown' }}</div>
                      <div class="member-email">{{ m.user?.email ?? '' }}</div>
                    </div>
                    <mat-form-field appearance="outline" class="role-select">
                      <mat-select [value]="m.role" (selectionChange)="assignRole(ws, m, $event.value)" [attr.aria-label]="'Role for ' + (m.user?.username ?? 'member')">
                        <mat-option *ngFor="let r of WORKSPACE_ROLES" [value]="r">{{ r }}</mat-option>
                      </mat-select>
                    </mat-form-field>
                    <button mat-icon-button (click)="removeMember(ws, m)" [attr.aria-label]="'Remove ' + (m.user?.username ?? 'member') + ' from workspace'">
                      <mat-icon>person_remove</mat-icon>
                    </button>
                  </div>
                  <div *ngIf="members.length === 0" class="empty">No members.</div>
                </div>
              </li>
              <li *ngIf="workspaces.length === 0" class="empty">No workspaces yet.</li>
            </ul>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .backoffice { max-width: 900px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
      .header h1 { margin: 0; }
      .subtitle { margin: 4px 0 0; color: var(--text-muted); font-size: 0.9rem; }
      .admin-badge {
        display: inline-flex; align-items: center; gap: 6px;
        background: #f0eefd; color: #5a4bd1; font-weight: 700; font-size: 0.78rem;
        padding: 6px 12px; border-radius: 20px;
      }
      .admin-badge mat-icon { font-size: 16px; width: 16px; height: 16px; }

      .forbidden {
        display: flex; align-items: center; gap: 12px;
        background: #fff4e5; border: 1px solid #ffd591; color: #b45309;
        padding: 18px 20px; border-radius: var(--radius-lg); margin-top: 16px;
      }
      .forbidden p { margin: 0; }

      .tab-body { padding: 20px 0; }
      .search { width: 320px; }

      .user-list, .ws-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .user-row {
        display: flex; align-items: center; gap: 14px;
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px;
      }
      .user-main { flex: 1; min-width: 0; }
      .user-name { font-weight: 700; display: flex; align-items: center; gap: 8px; }
      .you-badge { font-size: 0.66rem; font-weight: 700; color: var(--primary); background: #f0eefd; padding: 2px 8px; border-radius: 10px; }
      .role-pill { font-size: 0.66rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
      .role-pill.admin { background: #f0eefd; color: #5a4bd1; }
      .user-email { font-size: 0.8rem; color: var(--text-faint); margin-top: 2px; }
      .status-pill { font-size: 0.7rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
      .status-pill.active { background: #e6f7f1; color: #00875a; }
      .status-pill.suspended { background: #fdecef; color: var(--danger); }
      .user-actions { display: flex; gap: 4px; flex-wrap: wrap; }

      .ws-item { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
      .ws-toggle {
        all: unset; cursor: pointer; display: flex; align-items: center; gap: 12px;
        padding: 12px 16px; width: 100%; box-sizing: border-box; font-family: inherit;
      }
      .ws-toggle:hover { background: var(--surface-2); }
      .ws-badge { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 0.8rem; }
      .ws-name { font-weight: 700; }
      .ws-slug { font-size: 0.8rem; color: var(--text-faint); flex: 1; }
      .ws-toggle mat-icon { color: var(--text-faint); }

      .members { border-top: 1px solid var(--border); padding: 8px 16px 12px; }
      .member-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
      .member-main { flex: 1; min-width: 0; }
      .member-name { font-weight: 600; }
      .member-email { font-size: 0.78rem; color: var(--text-faint); }
      .role-select { width: 140px; }

      .empty { color: var(--text-faint); text-align: center; padding: 24px; }

      @media (max-width: 640px) {
        .search { width: 100%; }
        .user-row { flex-wrap: wrap; }
      }
    `
  ]
})
export class BackofficeComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly auth = inject(AuthService);

  readonly WORKSPACE_ROLES = WORKSPACE_ROLES;
  readonly ROLE_COLORS = ROLE_COLORS;
  readonly avatarColor = avatarColor;
  readonly initials = initials;

  users: User[] = [];
  workspaces: Workspace[] = [];
  members: WorkspaceMember[] = [];
  expandedWorkspaceId: string | null = null;
  search = '';

  get isRootAdmin(): boolean {
    return this.auth.currentUser()?.role === 'ROOT_ADMIN';
  }

  ngOnInit(): void {
    if (!this.isRootAdmin) return;
    this.loadUsers();
    this.loadWorkspaces();
  }

  loadUsers(): void {
    const query = this.search.trim() || undefined;
    this.adminService.listUsers(query).subscribe((page) => (this.users = page.content));
  }

  loadWorkspaces(): void {
    this.adminService.listWorkspaces().subscribe((workspaces) => (this.workspaces = workspaces));
  }

  toggleWorkspace(ws: Workspace): void {
    if (this.expandedWorkspaceId === ws.id) {
      this.expandedWorkspaceId = null;
      this.members = [];
      return;
    }
    this.expandedWorkspaceId = ws.id;
    this.adminService.listMembers(ws.id).subscribe((members) => (this.members = members));
  }

  assignRole(ws: Workspace, member: WorkspaceMember, role: WorkspaceRole): void {
    this.adminService.assignRole(ws.id, member.userId, role).subscribe(() => this.toggleWorkspace(ws));
  }

  removeMember(ws: Workspace, member: WorkspaceMember): void {
    this.adminService.removeMember(ws.id, member.userId).subscribe(() => this.toggleWorkspace(ws));
  }

  promote(user: User): void {
    this.adminService.updateUser(user.id, { role: 'ROOT_ADMIN' }).subscribe(() => this.loadUsers());
  }

  demote(user: User): void {
    this.adminService.updateUser(user.id, { role: 'USER' }).subscribe(() => this.loadUsers());
  }

  deactivate(user: User): void {
    this.adminService.updateUser(user.id, { active: false }).subscribe(() => this.loadUsers());
  }

  reactivate(user: User): void {
    this.adminService.updateUser(user.id, { active: true }).subscribe(() => this.loadUsers());
  }

  isSelf(user: User): boolean {
    return this.auth.currentUser()?.id === user.id;
  }

  displayName(user: User): string {
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return name || user.username;
  }
}
