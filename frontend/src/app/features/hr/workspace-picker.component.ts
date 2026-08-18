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
  templateUrl: './workspace-picker.component.html',
  styleUrl: './workspace-picker.component.css'
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
