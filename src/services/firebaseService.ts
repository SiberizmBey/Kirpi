/**
 * Kirpi Task & Team Hub - Real Firebase Service
 * Multi-Team Management, Real Avatar Uploads, Roles, Custom Email/Username Auth,
 * Team Logos, Team Invitations & Real-Time Sync
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../config/firebase';
import { AppUser, Task, ChatChannel, ChatMessage, Team, TeamInvitation, UserRole } from '../types';

const STORAGE_ACTIVE_USER_KEY = 'kirpi_active_user_id';

/**
 * Utility to strip undefined properties recursively from objects before writing to Firestore
 */
function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanFirestoreData(item)) as unknown as T;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanFirestoreData(value);
    }
  }
  return cleaned as T;
}

export class FirebaseService {
  private authListeners: ((user: AppUser | null) => void)[] = [];
  private currentUser: AppUser | null = null;
  private userDocUnsub: (() => void) | null = null;

  constructor() {
    this.initSession();
    this.cleanupLegacyData();
  }

  private async initSession() {
    const savedUserId = localStorage.getItem(STORAGE_ACTIVE_USER_KEY);
    if (savedUserId) {
      this.attachUserListener(savedUserId);
    }
  }

  /**
   * Cleanup any old legacy default teams (e.g. team-ana-ekip) or orphaned google test accounts
   */
  private async cleanupLegacyData() {
    try {
      // 1. Delete legacy default teams if they exist
      const legacyTeamDoc = await getDoc(doc(db, 'teams', 'team-ana-ekip'));
      if (legacyTeamDoc.exists()) {
        await deleteDoc(doc(db, 'teams', 'team-ana-ekip'));
      }

      // Check for any team named "Ana Geliştirme Ekibi"
      const teamsSnap = await getDocs(collection(db, 'teams'));
      teamsSnap.forEach(async (d) => {
        const t = d.data() as Team;
        if (t.name === 'Ana Geliştirme Ekibi' || t.name === 'Ana Çalışma Ekibi' || d.id === 'team-ana-ekip') {
          await deleteDoc(doc(db, 'teams', d.id));
        }
      });
    } catch (e) {
      console.warn('Cleanup notice:', e);
    }
  }

  private attachUserListener(userId: string) {
    if (this.userDocUnsub) {
      this.userDocUnsub();
    }

    this.userDocUnsub = onSnapshot(
      doc(db, 'users', userId),
      (snap) => {
        if (snap.exists()) {
          const userData = snap.data() as AppUser;
          this.currentUser = userData;
          this.notifyAuthListeners(userData);
        } else {
          this.currentUser = null;
          localStorage.removeItem(STORAGE_ACTIVE_USER_KEY);
          this.notifyAuthListeners(null);
        }
      },
      (err) => {
        console.warn('User listener error:', err);
      }
    );
  }

  private notifyAuthListeners(user: AppUser | null) {
    this.authListeners.forEach((cb) => cb(user));
  }

  // --- Custom Email / Username Auth ---

  public async registerWithEmail(params: {
    name: string;
    username?: string;
    email: string;
    password?: string;
    role?: UserRole;
    title?: string;
    avatarUrl?: string;
  }): Promise<AppUser> {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanUsername = params.username ? params.username.trim().toLowerCase().replace(/^@/, '') : '';
    const cleanName = params.name.trim();
    const cleanPassword = (params.password || '').trim();

    if (!cleanUsername) {
      throw new Error('Lütfen geçerli bir kullanıcı adı giriniz.');
    }

    if (!cleanEmail) {
      throw new Error('Lütfen geçerli bir e-posta adresi giriniz.');
    }

    if (!cleanPassword) {
      throw new Error('Lütfen hesabınız için bir şifre belirleyiniz.');
    }

    // Check if email or username already exists in Firestore
    const usersRef = collection(db, 'users');
    const allUsersSnap = await getDocs(usersRef);

    const existingEmail = allUsersSnap.docs.some(
      (d) => (d.data() as AppUser).email?.toLowerCase().trim() === cleanEmail
    );
    if (existingEmail) {
      throw new Error('Bu e-posta adresi ile kayıtlı bir hesap zaten var. Lütfen giriş yapın.');
    }

    const existingUsername = allUsersSnap.docs.some(
      (d) => (d.data() as AppUser).username?.toLowerCase().trim().replace(/^@/, '') === cleanUsername
    );
    if (existingUsername) {
      throw new Error('Bu kullanıcı adı zaten kullanılıyor. Lütfen farklı bir kullanıcı adı seçin.');
    }

    const safeIdSuffix = cleanUsername.replace(/[^a-z0-9_]/g, '') || Math.random().toString(36).substring(2, 8);
    const userId = `usr_${Date.now()}_${safeIdSuffix}`;
    const colors = ['#0070f3', '#10b981', '#f5a623', '#ec4899', '#8b5cf6', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: Partial<AppUser> = {
      id: userId,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      password: cleanPassword,
      role: params.role || 'MEMBER',
      title: params.title?.trim() || 'Ekip Üyesi',
      avatarColor: randomColor,
      status: 'ONLINE',
      teamIds: [],
      createdAt: new Date().toISOString(),
    };

    if (params.avatarUrl) {
      newUser.avatarUrl = params.avatarUrl;
    }

    const cleanedUser = cleanFirestoreData(newUser);

    try {
      await setDoc(doc(db, 'users', userId), cleanedUser);
      localStorage.setItem(STORAGE_ACTIVE_USER_KEY, userId);
      this.attachUserListener(userId);
      return cleanedUser as AppUser;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userId}`);
      throw error;
    }
  }

  public async loginWithEmailOrUsername(identifier: string, password?: string): Promise<AppUser> {
    const cleanIdent = identifier.trim().toLowerCase().replace(/^@/, '');
    const cleanPass = (password || '').trim();

    if (!cleanIdent) {
      throw new Error('Lütfen kullanıcı adınızı veya e-posta adresinizi girin.');
    }

    if (!cleanPass) {
      throw new Error('Lütfen şifrenizi girin.');
    }

    const usersRef = collection(db, 'users');
    const allUsersSnap = await getDocs(usersRef);

    // STRICT: Only match by username or email. Ad Soyad (user.name) is explicitly rejected.
    const matchedDoc = allUsersSnap.docs.find((d) => {
      const u = d.data() as AppUser;
      const uUsername = (u.username || '').toLowerCase().trim().replace(/^@/, '');
      const uEmail = (u.email || '').toLowerCase().trim();
      return (uUsername && uUsername === cleanIdent) || (uEmail && uEmail === cleanIdent);
    });

    if (!matchedDoc) {
      throw new Error('Kullanıcı bulunamadı. Lütfen kullanıcı adınızı veya e-posta adresinizi kontrol edin.');
    }

    const user = matchedDoc.data() as AppUser;

    // Strict password verification:
    const storedPassword = (user.password || '').trim();
    if (!storedPassword) {
      // User existed in database prior to password enforcement - assign this password and update
      try {
        await updateDoc(doc(db, 'users', user.id), { password: cleanPass });
        user.password = cleanPass;
      } catch (e) {
        console.warn('Could not update legacy user password:', e);
      }
    } else if (storedPassword !== cleanPass) {
      throw new Error('Girdiğiniz şifre hatalı. Lütfen şifrenizi kontrol edip tekrar deneyin.');
    }

    localStorage.setItem(STORAGE_ACTIVE_USER_KEY, user.id);
    this.attachUserListener(user.id);
    return user;
  }

  public async signOutUser(): Promise<void> {
    localStorage.removeItem(STORAGE_ACTIVE_USER_KEY);
    if (this.userDocUnsub) {
      this.userDocUnsub();
      this.userDocUnsub = null;
    }
    this.currentUser = null;
    this.notifyAuthListeners(null);
  }

  public onAuthChange(callback: (user: AppUser | null) => void): () => void {
    this.authListeners.push(callback);
    callback(this.currentUser);

    return () => {
      this.authListeners = this.authListeners.filter((cb) => cb !== callback);
    };
  }

  public async updateUserProfile(userId: string, data: Partial<AppUser>): Promise<void> {
    const path = `users/${userId}`;
    try {
      const cleanData = cleanFirestoreData(data);
      await updateDoc(doc(db, 'users', userId), cleanData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }

  public async deleteUser(userId: string): Promise<void> {
    const path = `users/${userId}`;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // --- Real-time Users Directory ---
  public subscribeUsers(callback: (users: AppUser[]) => void): () => void {
    const path = 'users';
    return onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const users = snapshot.docs.map((docSnap) => docSnap.data() as AppUser);
        callback(users);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  // --- Real-time Teams Management ---
  public subscribeTeams(callback: (teams: Team[]) => void): () => void {
    const path = 'teams';
    return onSnapshot(
      collection(db, 'teams'),
      (snapshot) => {
        const teams = snapshot.docs.map((docSnap) => docSnap.data() as Team);
        callback(teams);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  public async createTeam(teamData: {
    name: string;
    description: string;
    createdBy: string;
    managerIds: string[];
    memberIds: string[];
    color?: string;
    logoUrl?: string;
  }): Promise<Team> {
    const teamId = `team_${Date.now()}`;
    const path = `teams/${teamId}`;
    const colors = ['#0070f3', '#10b981', '#f5a623', '#ec4899', '#8b5cf6', '#06b6d4'];
    const color = teamData.color || colors[Math.floor(Math.random() * colors.length)];

    const allMemberIds = Array.from(
      new Set([...teamData.memberIds, ...teamData.managerIds, teamData.createdBy])
    );

    const newTeam: Partial<Team> = {
      id: teamId,
      name: teamData.name.trim(),
      description: teamData.description.trim() || 'Ekip çalışma grubu',
      createdBy: teamData.createdBy,
      managerIds: teamData.managerIds.length > 0 ? teamData.managerIds : [teamData.createdBy],
      memberIds: allMemberIds,
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (teamData.logoUrl) {
      newTeam.logoUrl = teamData.logoUrl;
    }

    try {
      await setDoc(doc(db, 'teams', teamId), cleanFirestoreData(newTeam));

      // Auto-create isolated channels for this team
      const teamGenelChan = {
        id: `chan_${teamId}_genel`,
        name: 'genel',
        description: `${newTeam.name} genel sohbet ve iletişim kanalı`,
        teamId: teamId,
      };
      const teamDuyuruChan = {
        id: `chan_${teamId}_duyurular`,
        name: 'görev-duyuruları',
        description: `${newTeam.name} görev ve ekip duyuruları`,
        teamId: teamId,
      };
      try {
        await setDoc(doc(db, 'channels', teamGenelChan.id), cleanFirestoreData(teamGenelChan));
        await setDoc(doc(db, 'channels', teamDuyuruChan.id), cleanFirestoreData(teamDuyuruChan));
      } catch (ce) {
        console.warn('Auto create team channels error:', ce);
      }

      // Update participating users' teamIds array
      for (const uid of allMemberIds) {
        try {
          await updateDoc(doc(db, 'users', uid), {
            teamIds: arrayUnion(teamId),
          });
        } catch (e) {
          // ignore if user not reachable
        }
      }

      return newTeam as Team;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  }

  public async updateTeam(teamId: string, data: Partial<Team>): Promise<void> {
    const path = `teams/${teamId}`;
    try {
      const payload = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'teams', teamId), cleanFirestoreData(payload));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }

  public async deleteTeam(teamId: string): Promise<void> {
    const path = `teams/${teamId}`;
    try {
      await deleteDoc(doc(db, 'teams', teamId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // --- Team Invitations (E-Posta Bazlı & Yönetici Onaylı Çift Taraflı Davet Sistemi) ---
  public subscribeAllInvitations(callback: (invitations: TeamInvitation[]) => void): () => void {
    const path = 'team_invitations';
    return onSnapshot(
      collection(db, 'team_invitations'),
      (snapshot) => {
        const invs = snapshot.docs.map((d) => d.data() as TeamInvitation);
        callback(invs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  public subscribeInvitations(
    userIdentifier: string,
    callback: (invitations: TeamInvitation[]) => void
  ): () => void {
    const path = 'team_invitations';
    const cleanIdOrEmail = userIdentifier.trim().toLowerCase();

    return onSnapshot(
      collection(db, 'team_invitations'),
      (snapshot) => {
        const invs = snapshot.docs
          .map((d) => d.data() as TeamInvitation)
          .filter(
            (inv) =>
              (inv.invitedEmail && inv.invitedEmail.toLowerCase() === cleanIdOrEmail) ||
              inv.invitedUserId === userIdentifier
          );
        callback(invs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  public async sendTeamInvitationByEmail(params: {
    teamId: string;
    teamName: string;
    teamColor?: string;
    teamLogoUrl?: string;
    invitedEmail: string;
    sender: AppUser;
  }): Promise<TeamInvitation> {
    const cleanEmail = params.invitedEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Lütfen geçerli bir tam e-posta adresi girin (örn: kullanici@sirket.com).');
    }

    // Check if there is already an active invitation for this email in this team
    const invCol = collection(db, 'team_invitations');
    const existingQ = query(
      invCol,
      where('teamId', '==', params.teamId),
      where('invitedEmail', '==', cleanEmail)
    );
    const existingSnap = await getDocs(existingQ);
    const activeInv = existingSnap.docs.find((docSnap) => {
      const data = docSnap.data() as TeamInvitation;
      return data.status === 'PENDING_USER_ACCEPT' || data.status === 'PENDING_MANAGER_APPROVAL';
    });

    if (activeInv) {
      throw new Error('Bu e-posta adresine bu ekip için zaten bekleyen aktif bir davet bulunmaktadır.');
    }

    const invId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const path = `team_invitations/${invId}`;

    const newInv: Partial<TeamInvitation> = {
      id: invId,
      teamId: params.teamId,
      teamName: params.teamName,
      teamColor: params.teamColor || '#0070f3',
      invitedEmail: cleanEmail,
      invitedByUserId: params.sender.id,
      invitedByName: params.sender.name,
      status: 'PENDING_USER_ACCEPT',
      createdAt: new Date().toISOString(),
    };

    if (params.teamLogoUrl) {
      newInv.teamLogoUrl = params.teamLogoUrl;
    }

    try {
      await setDoc(doc(db, 'team_invitations', invId), cleanFirestoreData(newInv));
      return newInv as TeamInvitation;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  }

  // Daveti Geri Çek (Yönetici Tarafından)
  public async revokeTeamInvitation(invitationId: string): Promise<void> {
    const invPath = `team_invitations/${invitationId}`;
    try {
      await deleteDoc(doc(db, 'team_invitations', invitationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, invPath);
      throw error;
    }
  }

  // Kullanıcı Davete Yanıt Verir (Kabul Ederse Yönetici Onayına Gider, Reddederse REJECTED)
  public async respondToTeamInvitation(
    invitationId: string,
    accept: boolean,
    user: AppUser
  ): Promise<void> {
    const invPath = `team_invitations/${invitationId}`;
    try {
      if (accept) {
        await updateDoc(doc(db, 'team_invitations', invitationId), {
          status: 'PENDING_MANAGER_APPROVAL',
          invitedUserId: user.id,
          invitedUserName: user.name,
          acceptedAt: new Date().toISOString(),
        });
      } else {
        await updateDoc(doc(db, 'team_invitations', invitationId), {
          status: 'REJECTED',
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, invPath);
      throw error;
    }
  }

  // Yönetici Katılımı Onaylar (Kullanıcı Ekip Üyeliğine Eklenir)
  public async approveTeamJoin(
    invitationId: string,
    teamId: string,
    invitedUserId: string
  ): Promise<void> {
    const invPath = `team_invitations/${invitationId}`;
    try {
      // 1. Update invitation status to ACCEPTED
      await updateDoc(doc(db, 'team_invitations', invitationId), {
        status: 'ACCEPTED',
        approvedAt: new Date().toISOString(),
      });

      // 2. Add user to team memberIds
      await updateDoc(doc(db, 'teams', teamId), {
        memberIds: arrayUnion(invitedUserId),
      });

      // 3. Add teamId to user teamIds
      await updateDoc(doc(db, 'users', invitedUserId), {
        teamIds: arrayUnion(teamId),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, invPath);
      throw error;
    }
  }

  // Yönetici Katılımı Reddeder
  public async rejectTeamJoin(invitationId: string): Promise<void> {
    const invPath = `team_invitations/${invitationId}`;
    try {
      await updateDoc(doc(db, 'team_invitations', invitationId), {
        status: 'REJECTED',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, invPath);
      throw error;
    }
  }

  public async removeMemberFromTeam(teamId: string, userId: string): Promise<void> {
    const path = `teams/${teamId}`;
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        memberIds: arrayRemove(userId),
        managerIds: arrayRemove(userId),
      });
      await updateDoc(doc(db, 'users', userId), {
        teamIds: arrayRemove(teamId),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  public async setTeamMemberRole(teamId: string, userId: string, role: 'MANAGER' | 'MEMBER'): Promise<void> {
    const path = `teams/${teamId}`;
    try {
      if (role === 'MANAGER') {
        await updateDoc(doc(db, 'teams', teamId), {
          managerIds: arrayUnion(userId),
          memberIds: arrayUnion(userId),
        });
      } else {
        await updateDoc(doc(db, 'teams', teamId), {
          managerIds: arrayRemove(userId),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }

  // --- Real-time Tasks ---
  public subscribeTasks(callback: (tasks: Task[]) => void): () => void {
    const path = 'tasks';
    return onSnapshot(
      collection(db, 'tasks'),
      (snapshot) => {
        const tasks = snapshot.docs.map((docSnap) => docSnap.data() as Task);
        tasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        callback(tasks);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  public async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'screenshots' | 'comments'>): Promise<Task> {
    const taskId = `task_${Date.now()}`;
    const path = `tasks/${taskId}`;
    const newTask: Task = {
      ...taskData,
      id: taskId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      screenshots: [],
      comments: [],
    };

    try {
      await setDoc(doc(db, 'tasks', taskId), cleanFirestoreData(newTask));

      // Post notification to team's #görev-duyuruları channel or fallback
      const targetChannelId = taskData.teamId ? `chan_${taskData.teamId}_duyurular` : 'chan-gorevler';
      try {
        await this.sendMessage(targetChannelId, {
          channelId: targetChannelId,
          senderId: taskData.assignedBy,
          senderName: taskData.assignedByName,
          senderRole: 'MANAGER',
          senderColor: '#10b981',
          text: `📋 Yeni Görev Atandı: "${newTask.title}" ➔ ${newTask.assignedToName} (Öncelik: ${newTask.priority}, Teslim: ${newTask.dueDate})`,
        });
      } catch (e) {
        console.warn('Could not post announcement message:', e);
      }

      return newTask;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  }

  public async updateTaskStatus(taskId: string, status: Task['status']): Promise<void> {
    const path = `tasks/${taskId}`;
    try {
      const updates: any = {
        status,
        updatedAt: new Date().toISOString(),
      };
      if (status === 'COMPLETED') {
        updates.completedAt = new Date().toISOString();
      }
      await updateDoc(doc(db, 'tasks', taskId), cleanFirestoreData(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  public async completeTask(
    taskId: string,
    payload: {
      completionNotes: string;
      screenshot?: { name: string; url: string };
      completedByName: string;
      completedById: string;
    }
  ): Promise<void> {
    const path = `tasks/${taskId}`;
    try {
      const taskDocRef = doc(db, 'tasks', taskId);
      const snap = await getDoc(taskDocRef);
      if (!snap.exists()) return;

      const currentTask = snap.data() as Task;
      const screenshots = currentTask.screenshots || [];

      if (payload.screenshot && payload.screenshot.url) {
        screenshots.push({
          id: `ss_${Date.now()}`,
          name: payload.screenshot.name,
          url: payload.screenshot.url,
          uploadedAt: new Date().toISOString(),
          uploadedByName: payload.completedByName,
        });
      }

      await updateDoc(
        taskDocRef,
        cleanFirestoreData({
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completionNotes: payload.completionNotes || '',
          screenshots: screenshots,
        })
      );

      // Post notification to #görev-duyuruları channel
      try {
        await this.sendMessage('chan-gorevler', {
          channelId: 'chan-gorevler',
          senderId: payload.completedById,
          senderName: payload.completedByName,
          senderRole: 'MEMBER',
          senderColor: '#0070f3',
          text: `✅ Görev Tamamlandı: "${currentTask.title}". Not: ${payload.completionNotes || 'Detay girilmedi.'}`,
          attachment: payload.screenshot?.url
            ? { name: payload.screenshot.name, url: payload.screenshot.url, type: 'IMAGE' }
            : undefined,
        });
      } catch (e) {
        console.warn('Could not post announcement message:', e);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  public async addCommentToTask(taskId: string, comment: { userId: string; userName: string; text: string }): Promise<void> {
    const path = `tasks/${taskId}`;
    try {
      const taskDocRef = doc(db, 'tasks', taskId);
      const newComment = {
        id: `c_${Date.now()}`,
        userId: comment.userId,
        userName: comment.userName,
        text: comment.text,
        createdAt: new Date().toISOString(),
      };
      await updateDoc(taskDocRef, {
        comments: arrayUnion(cleanFirestoreData(newComment)),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  public async requestTaskExtension(
    taskId: string,
    payload: { requestedDate: string; reason: string; requestedById: string; requestedByName: string }
  ): Promise<void> {
    const path = `tasks/${taskId}`;
    try {
      const taskDocRef = doc(db, 'tasks', taskId);
      const extensionReq = {
        requestedDate: payload.requestedDate,
        reason: payload.reason.trim(),
        requestedAt: new Date().toISOString(),
        status: 'PENDING',
      };

      const systemComment = {
        id: `c_${Date.now()}`,
        userId: payload.requestedById,
        userName: payload.requestedByName,
        text: `⏳ Ek Süre Talebi Gönderildi: Yeni teslim tarihi ${payload.requestedDate} olarak talep edildi. Gerekçe: "${payload.reason.trim()}"`,
        createdAt: new Date().toISOString(),
      };

      await updateDoc(taskDocRef, cleanFirestoreData({
        extensionRequest: extensionReq,
        updatedAt: new Date().toISOString(),
        comments: arrayUnion(cleanFirestoreData(systemComment)),
      }));

      // Post notification to #görev-duyuruları channel
      try {
        await this.sendMessage('chan-gorevler', {
          channelId: 'chan-gorevler',
          senderId: payload.requestedById,
          senderName: payload.requestedByName,
          senderRole: 'MEMBER',
          senderColor: '#f59e0b',
          text: `⏳ Ek Süre Talebi: ${payload.requestedByName}, görevi için (${payload.requestedDate}) tarihine ek süre talep etti.`,
        });
      } catch (e) {
        console.warn('Could not post extension request announcement:', e);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }

  public async reviewTaskExtension(
    taskId: string,
    approved: boolean,
    reviewerId: string,
    reviewerName: string
  ): Promise<void> {
    const path = `tasks/${taskId}`;
    try {
      const taskDocRef = doc(db, 'tasks', taskId);
      const snap = await getDoc(taskDocRef);
      if (!snap.exists()) return;

      const currentTask = snap.data() as Task;
      if (!currentTask.extensionRequest) return;

      const newStatus = approved ? 'APPROVED' : 'REJECTED';
      const updatedExtension = {
        ...currentTask.extensionRequest,
        status: newStatus,
        reviewedBy: reviewerId,
        reviewedByName: reviewerName,
        reviewedAt: new Date().toISOString(),
      };

      const updates: any = {
        extensionRequest: updatedExtension,
        updatedAt: new Date().toISOString(),
      };

      if (approved) {
        updates.dueDate = currentTask.extensionRequest.requestedDate;
      }

      const reviewComment = {
        id: `c_${Date.now()}`,
        userId: reviewerId,
        userName: reviewerName,
        text: approved
          ? `✅ Ek Süre Talebi Onaylandı: Yeni teslim tarihi ${currentTask.extensionRequest.requestedDate} olarak güncellendi.`
          : `❌ Ek Süre Talebi Reddedildi.`,
        createdAt: new Date().toISOString(),
      };

      updates.comments = arrayUnion(cleanFirestoreData(reviewComment));

      await updateDoc(taskDocRef, cleanFirestoreData(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }

  public async cancelTask(
    taskId: string,
    cancelledById: string,
    cancelledByName: string,
    reason?: string
  ): Promise<void> {
    const path = `tasks/${taskId}`;
    try {
      const taskDocRef = doc(db, 'tasks', taskId);
      const cancelComment = {
        id: `c_${Date.now()}`,
        userId: cancelledById,
        userName: cancelledByName,
        text: `🚫 Görev İptal Edildi: ${reason ? `Gerekçe: "${reason}"` : 'Yönetici tarafından iptal edildi.'}`,
        createdAt: new Date().toISOString(),
      };

      await updateDoc(
        taskDocRef,
        cleanFirestoreData({
          status: 'CANCELLED',
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason || 'Yönetici tarafından iptal edildi.',
          updatedAt: new Date().toISOString(),
          comments: arrayUnion(cleanFirestoreData(cancelComment)),
        })
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }

  public async deleteTask(taskId: string): Promise<void> {
    const path = `tasks/${taskId}`;
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public async addTaskComment(
    taskId: string,
    comment: { userId: string; userName: string; text: string }
  ): Promise<void> {
    const path = `tasks/${taskId}`;
    try {
      const taskDocRef = doc(db, 'tasks', taskId);
      const newComment = {
        id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: comment.userId,
        userName: comment.userName,
        text: comment.text.trim(),
        createdAt: new Date().toISOString(),
      };

      await updateDoc(taskDocRef, cleanFirestoreData({
        updatedAt: new Date().toISOString(),
        comments: arrayUnion(cleanFirestoreData(newComment)),
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      throw error;
    }
  }

  // --- Real-time Channels & Chat ---
  public subscribeChannels(callback: (channels: ChatChannel[]) => void): () => void {
    const path = 'channels';
    return onSnapshot(
      collection(db, 'channels'),
      (snapshot) => {
        const channels = snapshot.docs.map((docSnap) => docSnap.data() as ChatChannel);
        if (channels.length === 0) {
          this.seedInitialChannels();
        }
        callback(channels);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  public async createChannel(name: string, description: string, teamId?: string): Promise<ChatChannel> {
    const cleanName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    const channelId = `chan_${cleanName}_${Date.now()}`;
    const path = `channels/${channelId}`;

    const newChan: Partial<ChatChannel> = {
      id: channelId,
      name: cleanName,
      description: description || 'Takım kanalı',
    };

    if (teamId) {
      newChan.teamId = teamId;
    }

    try {
      await setDoc(doc(db, 'channels', channelId), cleanFirestoreData(newChan));
      return newChan as ChatChannel;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  }

  public subscribeMessages(channelId: string, callback: (messages: ChatMessage[]) => void): () => void {
    const path = `channels/${channelId}/messages`;
    const q = query(collection(db, 'channels', channelId, 'messages'), orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs.map((docSnap) => docSnap.data() as ChatMessage);
        callback(messages);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  public async sendMessage(
    channelId: string,
    messageData: Omit<ChatMessage, 'id' | 'createdAt'>
  ): Promise<ChatMessage> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `channels/${channelId}/messages/${messageId}`;

    const newMsg: Partial<ChatMessage> = {
      ...messageData,
      id: messageId,
      channelId,
      createdAt: new Date().toISOString(),
    };

    const cleanMsg = cleanFirestoreData(newMsg);

    try {
      await setDoc(doc(db, 'channels', channelId, 'messages', messageId), cleanMsg);
      return cleanMsg as ChatMessage;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  }

  public async seedInitialChannels(): Promise<void> {
    const defaults = [
      { id: 'chan-genel', name: 'genel', description: 'Tüm ekip üyeleri için genel sohbet ve günlük iletişim kanalı' },
      { id: 'chan-gorevler', name: 'görev-duyuruları', description: 'Yeni görev atamaları ve tamamlanan işlerin bildirimleri' },
    ];

    for (const c of defaults) {
      try {
        await setDoc(doc(db, 'channels', c.id), cleanFirestoreData(c));
      } catch (e) {
        console.warn('Seed channel error:', e);
      }
    }
  }
}

export const firebaseService = new FirebaseService();
