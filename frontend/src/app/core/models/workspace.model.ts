export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'HR' | 'MEMBER' | 'GUEST';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  slug: string;
  ownerId: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  createdAt: string;
  user?: import('./user.model').User;
}
