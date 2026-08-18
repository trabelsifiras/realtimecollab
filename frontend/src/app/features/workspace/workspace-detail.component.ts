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
  templateUrl: './workspace-detail.component.html',
  styleUrl: './workspace-detail.component.css'
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
