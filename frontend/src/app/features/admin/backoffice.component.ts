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
  templateUrl: './backoffice.component.html',
  styleUrl: './backoffice.component.css'
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
