export type UserStatus = 'ONLINE' | 'AWAY' | 'OFFLINE' | 'DO_NOT_DISTURB';
export type UserRole = 'USER' | 'ROOT_ADMIN';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  status: UserStatus;
  role?: UserRole;
  active?: boolean;
  createdAt: string;
  lastSeenAt?: string;
}

export interface UserResponse extends User {}
