import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="page-container">
      <h1>Profile</h1>

      <mat-card class="card">
        <mat-card-title>Personal information</mat-card-title>
        <mat-card-content>
          <div class="text-muted">{{ email() }}</div>
          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Username</mat-label>
              <input matInput formControlName="username" />
            </mat-form-field>
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>First name</mat-label>
              <input matInput formControlName="firstName" />
            </mat-form-field>
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Last name</mat-label>
              <input matInput formControlName="lastName" />
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" [disabled]="profileForm.invalid">Save</button>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card class="card">
        <mat-card-title>Change password</mat-card-title>
        <mat-card-content>
          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Current password</mat-label>
              <input matInput type="password" formControlName="currentPassword" />
            </mat-form-field>
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>New password</mat-label>
              <input matInput type="password" formControlName="newPassword" />
            </mat-form-field>
            <div *ngIf="passwordMessage" class="error-text">{{ passwordMessage }}</div>
            <button mat-raised-button color="primary" type="submit" [disabled]="passwordForm.invalid">Update password</button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .card {
        margin-bottom: 24px;
        padding: 8px;
        max-width: 560px;
      }
    `
  ]
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);

  profileForm = this.fb.nonNullable.group({
    username: ['', Validators.required],
    firstName: [''],
    lastName: ['']
  });

  passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  passwordMessage = '';

  constructor() {
    const user = this.auth.currentUser();
    if (user) {
      this.profileForm.patchValue({
        username: user.username,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? ''
      });
    }
  }

  email(): string {
    return this.auth.currentUser()?.email ?? '';
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.userService.updateProfile(this.profileForm.getRawValue()).subscribe();
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    this.passwordMessage = '';
    this.userService.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.passwordMessage = 'Password updated.';
        this.passwordForm.reset();
      },
      error: (err) => (this.passwordMessage = err?.error?.message ?? 'Failed to update password')
    });
  }
}
