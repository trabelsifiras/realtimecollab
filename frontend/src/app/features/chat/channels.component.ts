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
  templateUrl: './channels.component.html',
  styleUrl: './channels.component.css'
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
