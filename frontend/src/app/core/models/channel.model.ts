export type ChannelType = 'PUBLIC' | 'PRIVATE' | 'DIRECT';

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: ChannelType;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
