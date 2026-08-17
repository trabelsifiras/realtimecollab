import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Workspace } from '../../core/models/workspace.model';

const STORAGE_KEY = 'collab.hr.workspaceId';

/**
 * Shared workspace selector for the top-level HR pages. Loads the user's
 * workspaces, resolves an initial selection (last used, else first) and
 * persists the choice to localStorage.
 */
@Component({
  selector: 'app-workspace-picker',
  standalone: true,
  imports: [FormsModule, NgFor, MatFormFieldModule, MatSelectModule],
  template: `
    <mat-form-field appearance="outline" class="picker">
      <mat-label>Workspace</mat-label>
      <mat-select [ngModel]="workspaceId" (ngModelChange)="select($event)" aria-label="Select workspace">
        <mat-option *ngFor="let ws of workspaces" [value]="ws.id">{{ ws.name }}</mat-option>
      </mat-select>
    </mat-form-field>
  `,
  styles: [
    `
      .picker { width: 220px; }
      @media (max-width: 560px) {
        .picker { width: 100%; }
      }
    `
  ]
})
export class WorkspacePickerComponent implements OnInit {
  @Input() workspaceId: string | null = null;
  @Output() workspaceChange = new EventEmitter<string>();

  private readonly workspaceService = inject(WorkspaceService);

  workspaces: Workspace[] = [];

  ngOnInit(): void {
    this.workspaceService.list().subscribe((workspaces) => {
      this.workspaces = workspaces;
      if (!this.workspaceId && workspaces.length) {
        const stored = localStorage.getItem(STORAGE_KEY);
        const initial = workspaces.find((w) => w.id === stored)?.id ?? workspaces[0].id;
        this.workspaceChange.emit(initial);
      }
    });
  }

  select(id: string): void {
    localStorage.setItem(STORAGE_KEY, id);
    this.workspaceChange.emit(id);
  }
}
