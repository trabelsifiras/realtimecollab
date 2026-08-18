import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { RealtimeService } from '../../core/services/realtime.service';
import { NotificationService } from '../../core/services/notification.service';
import { REALTIME_EVENT_TYPES } from '../../core/models/realtime.model';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, SidebarComponent, TopbarComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css'
})
export class AppShellComponent implements OnInit, OnDestroy {
  private readonly realtime = inject(RealtimeService);
  private readonly notification = inject(NotificationService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroy$ = new Subject<void>();

  readonly isMobile = signal(false);

  ngOnInit(): void {
    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => this.isMobile.set(result.matches));

    this.realtime.connect();
    this.realtime.subscribeToNotifications();

    this.realtime
      .eventsOfType(REALTIME_EVENT_TYPES.NOTIFICATION_CREATED)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.notification.incrementUnread());

    this.notification.refreshUnreadCount().subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
