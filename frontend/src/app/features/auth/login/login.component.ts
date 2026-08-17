import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    NgIf
  ],
  template: `
    <div class="auth">
      <aside class="brand-panel">
        <div class="brand-logo">C</div>
        <h1>Where teams do their best work, together.</h1>
        <p>Real-time collaboration that feels like Slack, plans like Jira, and connects like Teams.</p>
        <ul class="feature-list">
          <li><mat-icon>bolt</mat-icon> Instant real-time updates</li>
          <li><mat-icon>view_kanban</mat-icon> Drag-and-drop task boards</li>
          <li><mat-icon>forum</mat-icon> Channels, chat & mentions</li>
        </ul>
      </aside>

      <main class="form-panel">
        <div class="form-box">
          <h2>Sign in</h2>
          <p class="subtitle">Welcome back, let's get things done.</p>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Email or username</mat-label>
              <mat-icon matPrefix>alternate_email</mat-icon>
              <input matInput formControlName="identifier" autocomplete="username" />
            </mat-form-field>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Password</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput type="password" formControlName="password" autocomplete="current-password" />
            </mat-form-field>

            <div *ngIf="error" class="error-text">{{ error }}</div>

            <button mat-raised-button color="primary" type="submit" class="full-width submit" [disabled]="form.invalid || loading">
              <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
              <span *ngIf="!loading">Sign in</span>
            </button>
          </form>

          <p class="switch">No account yet? <a routerLink="/register">Create one</a></p>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .auth {
        display: flex;
        min-height: 100vh;
      }

      .brand-panel {
        flex: 1 1 46%;
        background: linear-gradient(160deg, #4a0e4f 0%, #6c5ce7 60%, #36c5f0 100%);
        color: #fff;
        padding: 64px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .brand-logo {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.18);
        font-weight: 800;
        font-size: 1.6rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 32px;
        backdrop-filter: blur(4px);
      }

      .brand-panel h1 {
        font-size: 2.4rem;
        line-height: 1.15;
        margin: 0 0 20px;
        max-width: 460px;
      }

      .brand-panel p {
        font-size: 1.05rem;
        opacity: 0.92;
        max-width: 420px;
        margin: 0 0 32px;
        line-height: 1.6;
      }

      .feature-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .feature-list li {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        opacity: 0.95;
      }

      .feature-list mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .form-panel {
        flex: 1 1 54%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        background: var(--bg);
      }

      .form-box {
        width: 100%;
        max-width: 400px;
      }

      .form-box h2 {
        font-size: 1.7rem;
        margin: 0 0 6px;
      }

      .subtitle {
        color: var(--text-muted);
        margin: 0 0 28px;
      }

      mat-form-field {
        margin-bottom: 14px;
      }

      mat-form-field mat-icon {
        color: var(--text-faint);
        margin-right: 4px;
      }

      .submit {
        height: 48px;
        font-size: 0.95rem;
        margin-top: 8px;
      }

      .switch {
        text-align: center;
        margin-top: 22px;
        color: var(--text-muted);
        font-size: 0.9rem;
      }

      @media (max-width: 860px) {
        .brand-panel {
          display: none;
        }
      }
    `
  ]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  form = this.fb.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required]
  });

  loading = false;
  error = '';

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Invalid credentials';
      }
    });
  }
}
