import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { avatarColor, initials } from '../../shared/utils/avatar.util';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, MatButtonModule, MatMenuModule, MatBadgeModule, NgIf],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent {
  @Output() menuToggle = new EventEmitter<void>();

  readonly realtime = inject(RealtimeService);
  readonly notification = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly avatarColor = avatarColor;
  readonly initials = initials;

  connectionLabel(): string {
    return this.realtime.state() === 'CONNECTED' ? 'Live' : 'Connecting…';
  }

  connectionClass(): string {
    return this.realtime.state() === 'CONNECTED' ? 'online' : 'offline';
  }

  displayName(): string {
    const user = this.auth.currentUser();
    if (!user) return 'User';
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username;
  }

  email(): string {
    return this.auth.currentUser()?.email ?? '';
  }

  openNotifications(): void {
    void this.router.navigate(['/notifications']);
  }

  openProfile(): void {
    void this.router.navigate(['/profile']);
  }

  logout(): void {
    this.auth.logout().subscribe(() => {
      this.realtime.disconnect();
      void this.router.navigate(['/login']);
    });
  }
}
