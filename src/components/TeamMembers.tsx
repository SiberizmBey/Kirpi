/**
 * Kirpi Task & Team Hub - Team-Grouped Roster (Kadro & Ekip Dağılımı)
 * Strict Data Isolation: Users only see members of teams they belong to, grouped by team.
 * Includes Team Logos, Real Avatar Uploads, and Team Invitations.
 */

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  User,
  Clock,
  CheckCircle2,
  Mail,
  Layers,
  Plus,
  X,
  Trash2,
  ChevronRight,
  AtSign,
  Send,
} from 'lucide-react';
import { AppUser, Task, Team } from '../types';
import { firebaseService } from '../services/firebaseService';

interface TeamMembersProps {
  currentUser: AppUser | null;
  users: AppUser[];
  tasks: Task[];
  teams: Team[];
  onOpenAuth: () => void;
  onOpenProfileEdit: () => void;
  onOpenCreateTeam?: () => void;
}

export const TeamMembers: React.FC<TeamMembersProps> = ({
  currentUser,
  users,
  tasks,
  teams,
  onOpenAuth,
  onOpenProfileEdit,
  onOpenCreateTeam,
}) => {
  // Modal for inviting a user into a specific team
  const [inviteModalTeam, setInviteModalTeam] = useState<Team | null>(null);
  const [selectedUserIdToInvite, setSelectedUserIdToInvite] = useState<string>('');
  const [inviteSentFeedback, setInviteSentFeedback] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // Filter teams to ONLY those the current user belongs to (or manages)
  const myTeams = currentUser
    ? teams.filter(
        (t) =>
          t.memberIds.includes(currentUser.id) ||
          t.managerIds.includes(currentUser.id) ||
          t.createdBy === currentUser.id
      )
    : [];

  const isGlobalManager = currentUser?.role === 'MANAGER';

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteModalTeam || !selectedUserIdToInvite.trim() || !currentUser) return;

    const cleanEmail = selectedUserIdToInvite.trim().toLowerCase();

    try {
      setIsInviting(true);
      await firebaseService.sendTeamInvitationByEmail({
        teamId: inviteModalTeam.id,
        teamName: inviteModalTeam.name,
        teamColor: inviteModalTeam.color,
        teamLogoUrl: inviteModalTeam.logoUrl,
        invitedEmail: cleanEmail,
        sender: currentUser,
      });

      setInviteSentFeedback(`"${cleanEmail}" adresine ekip daveti başarıyla iletildi.`);
      setTimeout(() => {
        setInviteModalTeam(null);
        setSelectedUserIdToInvite('');
        setInviteSentFeedback(null);
      }, 2000);
    } catch (err: any) {
      console.error('Invite error:', err);
      alert(err.message || 'Davet gönderilirken hata oluştu.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleToggleManager = async (team: Team, memberId: string) => {
    const isCurrentlyManager = team.managerIds.includes(memberId);
    if (isCurrentlyManager) {
      if (team.managerIds.length <= 1) {
        alert('Ekipte en az bir yönetici kalmalıdır.');
        return;
      }
      await firebaseService.setTeamMemberRole(team.id, memberId, 'MEMBER');
    } else {
      await firebaseService.setTeamMemberRole(team.id, memberId, 'MANAGER');
    }
  };

  const handleRemoveMember = async (team: Team, memberId: string) => {
    if (confirm('Bu kullanıcıyı bu ekipten çıkarmak istediğinize emin misiniz?')) {
      await firebaseService.removeMemberFromTeam(team.id, memberId);
    }
  };

  // If user is not logged in
  if (!currentUser) {
    return (
      <div className="p-12 text-center rounded-xl border border-zinc-800 bg-zinc-950 max-w-md mx-auto space-y-4 my-8 font-sans">
        <Users className="w-10 h-10 text-zinc-500 mx-auto" />
        <div>
          <h3 className="text-base font-semibold text-white">Giriş Yapılması Gerekiyor</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Ekip kadrosunu ve çalışma gruplarını görüntülemek için lütfen oturum açın.
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all cursor-pointer shadow-sm"
        >
          Giriş Yap
        </button>
      </div>
    );
  }

  // If user is not in any team yet
  if (myTeams.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] max-w-lg mx-auto space-y-4 my-8 font-sans">
        <Layers className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Herhangi Bir Ekipte Değilsiniz</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            {currentUser.role === 'MANAGER'
              ? 'Yönetici olarak yeni bir çalışma grubu oluşturabilir ve üyeleri ekibinize davet edebilirsiniz.'
              : 'Ekip yöneticinizden sizi bir ekibe davet etmesini isteyin.'}
          </p>
        </div>
        {onOpenCreateTeam && currentUser.role === 'MANAGER' && (
          <button
            onClick={onOpenCreateTeam}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Yeni Ekip Oluştur</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="kirpi-team-roster" className="space-y-8 animate-fade-in font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)]">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[var(--text-secondary)]" />
            <span>Ekip Kadrosu & Çalışma Grupları</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Dahil olduğunuz ekipler ve bu ekiplerdeki çalışma arkadaşlarınız.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenProfileEdit}
            className="px-3 py-1.5 rounded-md bg-[var(--bg-inner)] border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium transition-all cursor-pointer"
          >
            Profilimi Düzenle
          </button>
        </div>
      </div>

      {/* Render Each Team as its own isolated block */}
      <div className="space-y-8">
        {myTeams.map((team) => {
          const isTeamManager =
            team.managerIds.includes(currentUser.id) ||
            team.createdBy === currentUser.id ||
            isGlobalManager;

          // Team-specific tasks
          const teamTasks = tasks.filter((t) => t.teamId === team.id);

          // Team managers
          const teamManagers = users.filter((u) => team.managerIds.includes(u.id));

          // Team regular members
          const teamMembersList = users.filter(
            (u) => team.memberIds.includes(u.id) && !team.managerIds.includes(u.id)
          );

          return (
            <div
              key={team.id}
              className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-card)] p-5 space-y-6 shadow-sm"
            >
              {/* Team Group Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  {team.logoUrl ? (
                    <img
                      src={team.logoUrl}
                      alt={team.name}
                      className="w-10 h-10 rounded-xl object-cover border border-[var(--border-subtle)] shadow-sm"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white uppercase shadow-sm"
                      style={{ backgroundColor: team.color || '#a855f7' }}
                    >
                      {team.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
                        {team.name}
                      </h2>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-inner)] border border-[var(--border-card)] text-[var(--text-secondary)] font-mono-code">
                        {team.memberIds.length} Üye
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{team.description}</p>
                  </div>
                </div>

                {isTeamManager && (
                  <button
                    onClick={() => {
                      setInviteModalTeam(team);
                      setSelectedUserIdToInvite('');
                      setInviteSentFeedback(null);
                    }}
                    className="px-3 py-1.5 rounded-md bg-[var(--bg-inner)] border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Bu Ekibe Davet Et</span>
                  </button>
                )}
              </div>

              {/* Members Grid in this Team */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Team Managers */}
                {teamManagers.map((mgr) => {
                  const userTasks = teamTasks.filter((t) => t.assignedTo === mgr.id);
                  const activeTasks = userTasks.filter((t) => t.status !== 'COMPLETED').length;
                  const doneTasks = userTasks.filter((t) => t.status === 'COMPLETED').length;

                  return (
                    <div
                      key={mgr.id}
                      className="p-4 rounded-xl bg-[var(--bg-inner)] border border-emerald-500/30 relative flex flex-col justify-between space-y-4 hover:border-emerald-500/60 transition-all group shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {mgr.avatarUrl ? (
                                <img
                                  src={mgr.avatarUrl}
                                  alt={mgr.name}
                                  className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/50 shadow-sm"
                                />
                              ) : (
                                <div
                                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white uppercase shadow-sm border-2 border-emerald-500/50"
                                  style={{ backgroundColor: mgr.avatarColor || '#10b981' }}
                                >
                                  {mgr.name.charAt(0)}
                                </div>
                              )}
                              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-card)]" />
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{mgr.name}</h3>
                                {mgr.id === currentUser.id && (
                                  <span className="text-[10px] text-[var(--text-muted)]">(Siz)</span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{mgr.title}</p>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            YÖNETİCİ
                          </span>
                        </div>

                        <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span className="truncate">{mgr.email}</span>
                        </div>
                      </div>

                      {/* Stats & Actions */}
                      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1 font-mono-code text-[11px]">
                            <Clock className="w-3 h-3 text-amber-500" />
                            {activeTasks} Aktif
                          </span>
                          <span className="flex items-center gap-1 font-mono-code text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            {doneTasks} Biten
                          </span>
                        </div>

                        {isTeamManager && mgr.id !== currentUser.id && (
                          <button
                            onClick={() => handleToggleManager(team, mgr.id)}
                            className="text-[11px] text-[var(--text-muted)] hover:text-amber-500 transition-colors cursor-pointer"
                            title="Yöneticilik Yetkisini Kaldır"
                          >
                            Üye Yap
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 2. Team Regular Members */}
                {teamMembersList.map((member) => {
                  const userTasks = teamTasks.filter((t) => t.assignedTo === member.id);
                  const activeTasks = userTasks.filter((t) => t.status !== 'COMPLETED').length;
                  const doneTasks = userTasks.filter((t) => t.status === 'COMPLETED').length;

                  return (
                    <div
                      key={member.id}
                      className="p-4 rounded-xl bg-[var(--bg-inner)] border border-[var(--border-card)] relative flex flex-col justify-between space-y-4 hover:border-[var(--border-hover)] transition-all group shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {member.avatarUrl ? (
                                <img
                                  src={member.avatarUrl}
                                  alt={member.name}
                                  className="w-11 h-11 rounded-full object-cover border-2 border-[var(--border-subtle)] shadow-sm"
                                />
                              ) : (
                                <div
                                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white uppercase shadow-sm border-2 border-[var(--border-subtle)]"
                                  style={{ backgroundColor: member.avatarColor || '#a855f7' }}
                                >
                                  {member.name.charAt(0)}
                                </div>
                              )}
                              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-purple-500 ring-2 ring-[var(--bg-card)]" />
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{member.name}</h3>
                                {member.id === currentUser.id && (
                                  <span className="text-[10px] text-[var(--text-muted)]">(Siz)</span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{member.title}</p>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-card)] flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />
                            ÜYE
                          </span>
                        </div>

                        <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      </div>

                      {/* Stats & Actions */}
                      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1 font-mono-code text-[11px]">
                            <Clock className="w-3 h-3 text-amber-500" />
                            {activeTasks} Aktif
                          </span>
                          <span className="flex items-center gap-1 font-mono-code text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            {doneTasks} Biten
                          </span>
                        </div>

                        {isTeamManager && member.id !== currentUser.id && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleManager(team, member.id)}
                              className="text-[11px] text-emerald-500 hover:underline cursor-pointer"
                              title="Bu Ekipte Yönetici Yap"
                            >
                              Yönetici Yap
                            </button>
                            <button
                              onClick={() => handleRemoveMember(team, member.id)}
                              className="text-[11px] text-red-500 hover:underline cursor-pointer"
                              title="Ekipten Çıkar"
                            >
                              Çıkar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* INVITE TO TEAM MODAL */}
      {inviteModalTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[var(--modal-backdrop)] backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-md rounded-xl bg-[var(--bg-modal)] border border-[var(--border-card)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--bg-modal)] z-20 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Ekibe Davet Gönder</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  "{inviteModalTeam.name}" ekibine katılmaları için kullanıcının e-posta adresini girin.
                </p>
              </div>
              <button onClick={() => setInviteModalTeam(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSentFeedback ? (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{inviteSentFeedback}</span>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[var(--text-secondary)] font-medium mb-1.5">
                    DAVET EDİLECEK E-POSTA ADRESİ *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="kullanici@sirket.com"
                    value={selectedUserIdToInvite}
                    onChange={(e) => setSelectedUserIdToInvite(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] font-mono-code outline-none focus:border-purple-500 text-xs placeholder-[var(--text-muted)]"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Tam e-posta adresi yazılmalıdır.</p>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteModalTeam(null)}
                    className="px-3.5 py-1.5 rounded-md bg-[var(--bg-inner)] border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedUserIdToInvite.trim() || isInviting}
                    className="px-4 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isInviting ? 'Gönderiliyor...' : 'Daveti Gönder'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
