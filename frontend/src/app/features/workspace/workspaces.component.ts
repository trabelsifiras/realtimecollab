import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Workspace } from '../../core/models/workspace.model';
import { avatarColor, initials } from '../../shared/utils/avatar.util';

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [ReactiveFormsModule, NgFor, NgIf, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './workspaces.component.html',
  styleUrl: './workspaces.component.css'
})
export class WorkspacesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly router = inject(Router);

  readonly avatarColor = avatarColor;
  readonly initials = initials;

  workspaces: Workspace[] = [];
  showForm = false;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.workspaceService.list().subscribe((ws) => (this.workspaces = ws));
  }

  create(): void {
    if (this.form.invalid) return;
    this.workspaceService.create(this.form.getRawValue()).subscribe((ws) => {
      this.showForm = false;
      this.form.reset();
      void this.router.navigate(['/workspaces', ws.id]);
    });
  }

  open(id: string): void {
    void this.router.navigate(['/workspaces', id]);
  }

  openProjects(id: string): void {
    void this.router.navigate(['/workspaces', id, 'projects']);
  }

  openChannels(id: string): void {
    void this.router.navigate(['/workspaces', id, 'channels']);
  }
}
