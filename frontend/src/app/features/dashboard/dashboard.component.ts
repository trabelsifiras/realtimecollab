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
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
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
