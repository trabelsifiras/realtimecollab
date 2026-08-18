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
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
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
