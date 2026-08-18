import { Component, Input, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ProjectService } from '../../core/services/project.service';
import { Project, ProjectStatus } from '../../core/models/project.model';
import { avatarColor, initials } from '../../shared/utils/avatar.util';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNING: '#6b778c',
  ACTIVE: '#00875a',
  ON_HOLD: '#ecb22e',
  COMPLETED: '#36c5f0',
  ARCHIVED: '#9b9b9b'
};

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgFor, NgIf, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatSelectModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit {
  @Input() workspaceId!: string;

  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);

  readonly avatarColor = avatarColor;
  readonly initials = initials;

  projects: Project[] = [];
  statuses: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];
  showForm = false;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    key: [''],
    status: ['ACTIVE' as ProjectStatus]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.projectService.list(this.workspaceId).subscribe((projects) => (this.projects = projects));
  }

  create(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.projectService.create(this.workspaceId, { name: value.name, key: value.key || undefined, status: value.status }).subscribe(() => {
      this.showForm = false;
      this.form.reset({ status: 'ACTIVE' });
      this.load();
    });
  }

  statusColor(status: ProjectStatus): string {
    return STATUS_COLORS[status];
  }

  open(id: string): void {
    void this.router.navigate(['/projects', id]);
  }
}
