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
import { ChannelService } from '../../core/services/channel.service';
import { Channel, ChannelType } from '../../core/models/channel.model';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgFor, NgIf, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatSelectModule],
  template: `
    <div class="page-container">
      <button mat-button class="back" routerLink="/workspaces/{{ workspaceId }}">
        <mat-icon>arrow_back</mat-icon> Workspace
      </button>

      <div class="header">
        <h1>Channels</h1>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>{{ showForm ? 'close' : 'add' }}</mat-icon> New channel
        </button>
      </div>

      <div *ngIf="showForm" class="form-card">
        <form [formGroup]="form" (ngSubmit)="create()">
          <div class="row">
            <mat-form-field class="grow" appearance="outline">
              <mat-label>Channel name</mat-label>
              <input matInput formControlName="name" placeholder="e.g. backend" />
            </mat-form-field>
            <mat-form-field class="type" appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select formControlName="type">
                <mat-option *ngFor="let t of types" [value]="t">{{ t }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">Create channel</button>
        </form>
      </div>

      <div class="channel-list">
        <button *ngFor="let c of channels" class="channel-item" (click)="open(c.id)">
          <span class="channel-icon" [class.private]="c.type === 'PRIVATE'">
            <mat-icon>{{ c.type === 'PRIVATE' ? 'lock' : 'tag' }}</mat-icon>
          </span>
          <div class="channel-body">
            <div class="channel-name"># {{ c.name }}</div>
            <div class="channel-type">{{ c.type }}</div>
          </div>
          <mat-icon class="arrow">chevron_right</mat-icon>
        </button>
      </div>

      <div *ngIf="channels.length === 0 && !showForm" class="empty-card">
        <mat-icon>forum</mat-icon>
        <p>No channels yet. Create one to start the conversation.</p>
      </div>
    </div>
  `,
  styles: [
    `
      .back {
        color: var(--text-muted);
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .header h1 {
        margin: 0;
      }
      .form-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 20px;
        margin-bottom: 24px;
        max-width: 520px;
        box-shadow: var(--shadow-xs);
      }
      .row {
        display: flex;
        gap: 12px;
      }
      .grow {
        flex: 1;
      }
      .type {
        width: 150px;
      }
      .channel-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: 640px;
      }
      .channel-item {
        display: flex;
        align-items: center;
        gap: 14px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 14px 18px;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        transition: box-shadow 0.15s ease, transform 0.12s ease;
      }
      .channel-item:hover {
        box-shadow: var(--shadow-sm);
        transform: translateY(-1px);
      }
      .channel-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: #eef0ff;
        color: var(--primary);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .channel-icon.private {
        background: #fff3e0;
        color: #e67e22;
      }
      .channel-body {
        flex: 1;
      }
      .channel-name {
        font-weight: 600;
      }
      .channel-type {
        font-size: 0.75rem;
        color: var(--text-faint);
        text-transform: capitalize;
      }
      .arrow {
        color: var(--text-faint);
      }
      .empty-card {
        text-align: center;
        background: var(--surface);
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius-lg);
        padding: 64px;
        color: var(--text-muted);
      }
      .empty-card mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--text-faint);
      }
    `
  ]
})
export class ChannelsComponent implements OnInit {
  @Input() workspaceId!: string;

  private readonly fb = inject(FormBuilder);
  private readonly channelService = inject(ChannelService);
  private readonly router = inject(Router);

  channels: Channel[] = [];
  types: ChannelType[] = ['PUBLIC', 'PRIVATE'];
  showForm = false;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['PUBLIC' as ChannelType]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.channelService.list(this.workspaceId).subscribe((channels) => (this.channels = channels));
  }

  create(): void {
    if (this.form.invalid) return;
    const { name, type } = this.form.getRawValue();
    this.channelService.create(this.workspaceId, { type, name }).subscribe((channel) => {
      this.showForm = false;
      this.form.reset({ type: 'PUBLIC' });
      void this.router.navigate(['/channels', channel.id]);
    });
  }

  open(id: string): void {
    void this.router.navigate(['/channels', id]);
  }
}
