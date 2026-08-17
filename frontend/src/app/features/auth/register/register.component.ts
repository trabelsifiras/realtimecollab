import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, NgIf],
  template: `
    <div class="auth">
      <aside class="brand-panel">
        <div class="brand-logo">C</div>
        <h1>Start collaborating in real time.</h1>
        <p>Create your workspace, invite your team, and ship faster with live boards, chat and notifications.</p>
        <ul class="feature-list">
          <li><mat-icon>group_add</mat-icon> Team workspaces & roles</li>
          <li><mat-icon>checklist</mat-icon> Kanban boards & tasks</li>
          <li><mat-icon>notifications_active</mat-icon> Presence & instant alerts</li>
        </ul>
      </aside>

      <main class="form-panel">
        <div class="form-box">
          <h2>Create your account</h2>
          <p class="subtitle">Free to start — no credit card required.</p>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Email</mat-label>
              <mat-icon matPrefix>mail</mat-icon>
              <input matInput type="email" formControlName="email" autocomplete="email" />
            </mat-form-field>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Username</mat-label>
              <mat-icon matPrefix>alternate_email</mat-icon>
              <input matInput formControlName="username" autocomplete="username" />
            </mat-form-field>

            <div class="row">
              <mat-form-field class="half" appearance="outline">
                <mat-label>First name</mat-label>
                <input matInput formControlName="firstName" />
              </mat-form-field>
              <mat-form-field class="half" appearance="outline">
                <mat-label>Last name</mat-label>
                <input matInput formControlName="lastName" />
              </mat-form-field>
            </div>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Password</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput type="password" formControlName="password" autocomplete="new-password" />
              <mat-hint>At least 8 characters</mat-hint>
            </mat-form-field>

            <div *ngIf="error" class="error-text">{{ error }}</div>

            <button mat-raised-button color="primary" type="submit" class="full-width submit" [disabled]="form.invalid || loading">
              Create account
            </button>
          </form>

          <p class="switch">Already have an account? <a routerLink="/login">Sign in</a></p>
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
        background: linear-gradient(160deg, #2b1055 0%, #6c5ce7 55%, #00b87c 120%);
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
        max-width: 420px;
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
        margin-bottom: 12px;
      }
      mat-form-field mat-icon {
        color: var(--text-faint);
        margin-right: 4px;
      }
      .row {
        display: flex;
        gap: 12px;
      }
      .half {
        flex: 1;
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
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    firstName: [''],
    lastName: [''],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  loading = false;
  error = '';

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Registration failed';
      }
    });
  }
}
