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
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
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
