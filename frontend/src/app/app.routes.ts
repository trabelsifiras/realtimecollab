import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'workspaces', loadComponent: () => import('./features/workspace/workspaces.component').then((m) => m.WorkspacesComponent) },
      { path: 'workspaces/:workspaceId', loadComponent: () => import('./features/workspace/workspace-detail.component').then((m) => m.WorkspaceDetailComponent) },
      { path: 'workspaces/:workspaceId/projects', loadComponent: () => import('./features/project/projects.component').then((m) => m.ProjectsComponent) },
      { path: 'projects/:projectId', loadComponent: () => import('./features/task/task-board.component').then((m) => m.TaskBoardComponent) },
      { path: 'projects/:projectId/tasks/:taskId', loadComponent: () => import('./features/task/task-details.component').then((m) => m.TaskDetailsComponent) },
      { path: 'workspaces/:workspaceId/channels', loadComponent: () => import('./features/chat/channels.component').then((m) => m.ChannelsComponent) },
      { path: 'channels/:channelId', loadComponent: () => import('./features/chat/chat.component').then((m) => m.ChatComponent) },
      { path: 'timesheet', loadComponent: () => import('./features/hr/timesheet.component').then((m) => m.TimesheetComponent) },
      { path: 'leave', loadComponent: () => import('./features/hr/leave.component').then((m) => m.LeaveComponent) },
      { path: 'hr', loadComponent: () => import('./features/hr/hr-dashboard.component').then((m) => m.HrDashboardComponent) },
      { path: 'backoffice', loadComponent: () => import('./features/admin/backoffice.component').then((m) => m.BackofficeComponent) },
      { path: 'notifications', loadComponent: () => import('./features/notification/notifications.component').then((m) => m.NotificationsComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent) }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
