/**
 * Kirpi Task & Team Hub - Type Definitions
 * Email-Based Invitations with Manager Final Approval & Revoke,
 * Team-Scoped Roles (Creator is auto Manager), Full Task Management
 */

export type TeamRole = 'MANAGER' | 'MEMBER';
export type UserRole = 'MANAGER' | 'MEMBER'; // Kept for backwards compatibility if needed

export interface AppUser {
  id: string;
  name: string;
  username?: string; // Custom username (e.g. ahmet_dev)
  email: string;
  title: string;
  avatarColor: string;
  avatarUrl?: string; // Real uploaded image (Base64 data URL)
  status: 'ONLINE' | 'AWAY' | 'OFFLINE';
  createdAt: string;
  teamIds?: string[];
  role?: UserRole;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  managerIds: string[]; // Team managers (Creator is automatically here)
  memberIds: string[]; // All members including managers
  color: string;
  logoUrl?: string; // Team logo / avatar (Base64 DataURL or image link)
  createdAt: string;
  updatedAt?: string;
}

export type InvitationStatus =
  | 'PENDING_USER_ACCEPT'
  | 'PENDING_MANAGER_APPROVAL'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'REVOKED';

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  teamColor?: string;
  teamLogoUrl?: string;
  invitedEmail: string; // Exact email address required
  invitedUserId?: string;
  invitedUserName?: string;
  invitedByUserId: string;
  invitedByName: string;
  status: InvitationStatus;
  createdAt: string;
  acceptedAt?: string;
  approvedAt?: string;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';

export interface TaskScreenshot {
  id: string;
  url: string; // Base64 data URL or image link
  name: string;
  uploadedAt: string;
  uploadedByName: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface TaskExtensionRequest {
  requestedDate: string;
  reason: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
}

export interface Task {
  id: string;
  teamId?: string; // Linked team
  title: string;
  description: string;
  assignedTo: string; // User ID
  assignedToName: string;
  assignedBy: string; // User ID (Manager)
  assignedByName: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  completionNotes?: string;
  screenshots: TaskScreenshot[];
  comments: TaskComment[];
  extensionRequest?: TaskExtensionRequest;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface ChatChannel {
  id: string;
  teamId?: string;
  name: string;
  description: string;
  isPrivate?: boolean;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole?: UserRole | TeamRole;
  senderColor: string;
  senderAvatarUrl?: string;
  text: string;
  attachment?: {
    name: string;
    url: string;
    type: 'IMAGE' | 'FILE';
  };
  createdAt: string;
}

export type AppTheme = 'DARK' | 'LIGHT' | 'AMOLED' | 'SYSTEM';
