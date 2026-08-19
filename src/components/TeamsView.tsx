/**
 * Kirpi - Teams Management View (Ekipler)
 * Multi-Team Management, Team Logo Uploads, Team Editing, Email-Based Invitations & Team Role Management
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  UserCheck,
  UserPlus,
  X,
  Check,
  Trash2,
  Edit2,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  Clock,
  Mail,
  Send,
  Loader2,
  Undo2,
  AlertCircle,
  ShieldAlert,
  UserCog,
  Crown,
} from 'lucide-react';
import { Team, AppUser, Task, TeamInvitation } from '../types';
import { firebaseService } from '../services/firebaseService';
import { compressImage } from '../utils/imageCompressor';

interface TeamsViewProps {
  currentUser: AppUser | null;
  teams: Team[];
  users: AppUser[];
  tasks: Task[];
  onOpenAuth: () => void;
}

export const TeamsView: React.FC<TeamsViewProps> = ({
  currentUser,
  teams,
  users,
  tasks,
  onOpenAuth,
}) => {
  // Create Team Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);

  // Edit Team Modal States
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLogo, setEditLogo] = useState<string | undefined>(undefined);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Email-based Invitation Modal States
  const [invitingTeam, setInvitingTeam] = useState<Team | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Active Team Invitations across all teams
  const [allInvitations, setAllInvitations] = useState<TeamInvitation[]>([]);

  const [isProcessingImg, setIsProcessingImg] = useState(false);

  // Real-time subscription to team invitations
  useEffect(() => {
    const unsub = firebaseService.subscribeAllInvitations((invs) => {
      setAllInvitations(invs);
    });
    return () => unsub();
  }, []);

  // Strict isolation: only show teams currentUser belongs to or created
  const myTeams = currentUser
    ? teams.filter(
        (t) =>
          t.memberIds.includes(currentUser.id) ||
          t.managerIds.includes(currentUser.id) ||
          t.createdBy === currentUser.id
      )
    : [];

  // Team Logo Handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImg(true);
      const compressed = await compressImage(file, {
        maxWidth: 256,
        maxHeight: 256,
        quality: 0.88,
        cropToSquare: true,
      });

      if (isEdit) {
        setEditLogo(compressed);
      } else {
        setNewTeamLogo(compressed);
      }
    } catch (err: any) {
      alert(err.message || 'Ekip görseli yüklenirken hata oluştu.');
    } finally {
      setIsProcessingImg(false);
    }
  };

  // Create Team: Creator is automatically Manager
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !currentUser) return;

    try {
      setIsCreating(true);
      await firebaseService.createTeam({
        name: newTeamName.trim(),
        description: newTeamDesc.trim() || 'Ekip çalışma alanı',
        createdBy: currentUser.id,
        managerIds: [currentUser.id],
        memberIds: [currentUser.id],
        logoUrl: newTeamLogo,
      });

      setIsCreateModalOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
      setNewTeamLogo(undefined);
    } catch (err: any) {
      console.error('Create team error:', err);
      alert(err.message || 'Ekip oluşturulurken bir hata oluştu.');
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setEditName(team.name);
    setEditDesc(team.description);
    setEditLogo(team.logoUrl);
  };

  // Submit Edit Team
  const handleSaveTeamEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !editName.trim()) return;

    try {
      setIsSavingEdit(true);
      await firebaseService.updateTeam(editingTeam.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        logoUrl: editLogo || undefined,
      });
      setEditingTeam(null);
    } catch (err: any) {
      console.error('Edit team error:', err);
      alert(err.message || 'Ekip güncellenirken hata oluştu.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Send Email-Based Invitation
  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitingTeam || !inviteEmail.trim() || !currentUser) return;

    const targetEmail = inviteEmail.trim().toLowerCase();

    // Verification check: email structure
    if (!targetEmail.includes('@') || !targetEmail.includes('.')) {
      setInviteFeedback({
        type: 'error',
        message: 'Lütfen geçerli ve tam bir e-posta adresi yazın (örn: isim@sirket.com).',
      });
      return;
    }

    try {
      setIsSendingInvite(true);
      setInviteFeedback(null);

      await firebaseService.sendTeamInvitationByEmail({
        teamId: invitingTeam.id,
        teamName: invitingTeam.name,
        teamColor: invitingTeam.color,
        teamLogoUrl: invitingTeam.logoUrl,
        invitedEmail: targetEmail,
        sender: currentUser,
      });

      setInviteFeedback({
        type: 'success',
        message: `"${targetEmail}" adresine ekip daveti gönderildi. Kullanıcı daveti kabul ettikten sonra yönetici onayınıza düşecektir.`,
      });

      setInviteEmail('');
      setTimeout(() => {
        setInviteFeedback(null);
      }, 4000);
    } catch (err: any) {
      console.error('Invite error:', err);
      setInviteFeedback({
        type: 'error',
        message: err.message || 'Davet gönderilirken bir hata oluştu.',
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Revoke Sent Invitation (Manager)
  const handleRevokeInvitation = async (invitationId: string) => {
    if (confirm('Bu daveti geri çekmek istediğinize emin misiniz?')) {
      try {
        await firebaseService.revokeTeamInvitation(invitationId);
      } catch (err: any) {
        alert(err.message || 'Davet geri çekilirken hata oluştu.');
      }
    }
  };

  // Approve Team Join Request (Manager)
  const handleApproveJoin = async (inv: TeamInvitation) => {
    if (!inv.invitedUserId) return;
    try {
      await firebaseService.approveTeamJoin(inv.id, inv.teamId, inv.invitedUserId);
    } catch (err: any) {
      alert(err.message || 'Katılım onaylanırken hata oluştu.');
    }
  };

  // Reject Team Join Request (Manager)
  const handleRejectJoin = async (invitationId: string) => {
    if (confirm('Bu katılım talebini reddetmek istediğinize emin misiniz?')) {
      try {
        await firebaseService.rejectTeamJoin(invitationId);
      } catch (err: any) {
        alert(err.message || 'Talep reddedilirken hata oluştu.');
      }
    }
  };

  // Change Team Member Role (Manager only)
  const handleChangeMemberRole = async (team: Team, userId: string, newRole: 'MANAGER' | 'MEMBER') => {
    if (newRole === 'MEMBER' && team.managerIds.includes(userId) && team.managerIds.length === 1) {
      alert('Ekipte en az bir yönetici bulunmalıdır.');
      return;
    }
    try {
      await firebaseService.setTeamMemberRole(team.id, userId, newRole);
    } catch (err: any) {
      alert(err.message || 'Rol güncellenirken hata oluştu.');
    }
  };

  // Remove Member (Manager only)
  const handleRemoveMember = async (team: Team, userId: string) => {
    if (confirm('Bu üyeyi ekipten çıkarmak istediğinize emin misiniz?')) {
      try {
        await firebaseService.removeMemberFromTeam(team.id, userId);
      } catch (err: any) {
        alert(err.message || 'Üye çıkarılırken hata oluştu.');
      }
    }
  };

  // Delete Team (Manager only)
  const handleDeleteTeam = async (teamId: string) => {
    if (confirm('Bu ekibi ve tüm çalışma verilerini kalıcı olarak silmek istediğinize emin misiniz?')) {
      try {
        await firebaseService.deleteTeam(teamId);
      } catch (err: any) {
        alert(err.message || 'Ekip silinirken hata oluştu.');
      }
    }
  };

  return (
    <div id="kirpi-teams-view" className="space-y-6 animate-fade-in font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-zinc-950 border border-zinc-800">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-5 h-5 text-zinc-400" />
            <span>Çalışma Ekiplerim ({myTeams.length})</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Dahil olduğunuz ekipleri görüntüleyin, tam e-posta adresiyle güvenli davetler gönderin ve ekip içi rolleri yönetin.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Yeni Ekip Oluştur</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all cursor-pointer"
            >
              Giriş Yap
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {myTeams.length === 0 && (
        <div className="p-10 rounded-xl bg-zinc-950 border border-zinc-800 text-center max-w-xl mx-auto space-y-4 my-8">
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto text-zinc-400 border border-zinc-800">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Dahil Olduğunuz Ekip Bulunmuyor</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Kendi çalışma grubunuzu oluşturmak için yukarıdaki "Yeni Ekip Oluştur" butonunu kullanabilir veya bir ekip yöneticisinin e-posta adresinize davet iletmesini bekleyebilirsiniz.
            </p>
          </div>

          {currentUser && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all cursor-pointer shadow-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>İlk Ekibinizi Oluşturun</span>
            </button>
          )}
        </div>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {myTeams.map((team) => {
          const isTeamManager =
            currentUser &&
            (team.managerIds.includes(currentUser.id) || team.createdBy === currentUser.id);

          const teamTasks = tasks.filter((t) => t.teamId === team.id);
          const managers = users.filter((u) => team.managerIds.includes(u.id));
          const members = users.filter(
            (u) => team.memberIds.includes(u.id) && !team.managerIds.includes(u.id)
          );

          // Pending invitations sent for this team
          const pendingSentInvitations = allInvitations.filter(
            (inv) => inv.teamId === team.id && inv.status === 'PENDING_USER_ACCEPT'
          );

          // Pending join approvals for this team
          const pendingApprovals = allInvitations.filter(
            (inv) => inv.teamId === team.id && inv.status === 'PENDING_MANAGER_APPROVAL'
          );

          return (
            <div
              key={team.id}
              className="vercel-card p-5 rounded-xl space-y-5 border border-zinc-800 bg-zinc-950 flex flex-col justify-between shadow-lg"
            >
              <div className="space-y-4">
                {/* Team Header with Logo / Color */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="w-12 h-12 rounded-xl object-cover border border-zinc-700 shadow-md flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white uppercase shadow-md flex-shrink-0"
                        style={{ backgroundColor: team.color || '#0070f3' }}
                      >
                        {team.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-white">{team.name}</h2>
                        {team.createdBy === currentUser?.id && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono-code flex items-center gap-1">
                            <Crown className="w-2.5 h-2.5 text-amber-400" /> Kurucu
                          </span>
                        )}
                        {isTeamManager && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 font-mono-code">
                            Yöneticisiniz
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{team.description}</p>
                    </div>
                  </div>

                  {isTeamManager && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(team)}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                        title="Ekip Bilgilerini & Üyeleri Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-zinc-900 transition-colors cursor-pointer"
                        title="Ekibi Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Managers Section */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono-code text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    Ekip Yöneticileri ({managers.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {managers.map((mgr) => (
                      <div
                        key={mgr.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs"
                      >
                        {mgr.avatarUrl ? (
                          <img
                            src={mgr.avatarUrl}
                            alt={mgr.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white uppercase"
                            style={{ backgroundColor: mgr.avatarColor || '#10b981' }}
                          >
                            {mgr.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium">{mgr.name}</span>
                        {mgr.id === currentUser?.id && <span className="text-[10px] text-zinc-400">(Siz)</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Members Section */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono-code text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-blue-400" />
                    Ekip Üyeleri ({members.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((mem) => (
                      <div
                        key={mem.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs"
                      >
                        {mem.avatarUrl ? (
                          <img
                            src={mem.avatarUrl}
                            alt={mem.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white uppercase"
                            style={{ backgroundColor: mem.avatarColor || '#0070f3' }}
                          >
                            {mem.name.charAt(0)}
                          </div>
                        )}
                        <span>{mem.name}</span>
                        {mem.id === currentUser?.id && <span className="text-[10px] text-zinc-500">(Siz)</span>}
                      </div>
                    ))}
                    {members.length === 0 && (
                      <span className="text-xs text-zinc-600 italic">Henüz üye katılmadı</span>
                    )}
                  </div>
                </div>

                {/* MANAGER ONLY: Pending Approvals & Invitations Trackers */}
                {isTeamManager && (
                  <div className="space-y-2.5 pt-2 border-t border-zinc-900">
                    {/* Awaiting Manager Approval */}
                    {pendingApprovals.length > 0 && (
                      <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-2">
                        <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
                          <span className="flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" /> Katılım Onayı Bekleyenler ({pendingApprovals.length})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {pendingApprovals.map((inv) => (
                            <div
                              key={inv.id}
                              className="p-2 rounded bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-semibold text-white">{inv.invitedUserName || inv.invitedEmail}</p>
                                <p className="text-[10px] text-zinc-400">{inv.invitedEmail}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleRejectJoin(inv.id)}
                                  className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white text-[11px] cursor-pointer"
                                >
                                  Reddet
                                </button>
                                <button
                                  onClick={() => handleApproveJoin(inv)}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3 stroke-[3]" /> Katılımı Onayla
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pending Sent Invitations (Can Revoke) */}
                    {pendingSentInvitations.length > 0 && (
                      <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span className="flex items-center gap-1 font-mono-code text-[11px]">
                            <Mail className="w-3.5 h-3.5 text-amber-400" />
                            Bekleyen E-Posta Davetleri ({pendingSentInvitations.length})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {pendingSentInvitations.map((inv) => (
                            <div
                              key={inv.id}
                              className="p-2 rounded bg-zinc-950 border border-zinc-850 flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="text-white font-mono-code text-[11px]">{inv.invitedEmail}</p>
                                <p className="text-[10px] text-zinc-500">Kullanıcının kabulü bekleniyor...</p>
                              </div>
                              <button
                                onClick={() => handleRevokeInvitation(inv.id)}
                                className="px-2 py-0.5 rounded text-[11px] text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-900/60 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Undo2 className="w-3 h-3" /> Daveti Geri Çek
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Actions & Stats */}
              <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-zinc-400">
                  <span className="flex items-center gap-1 font-mono-code text-[11px]">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {teamTasks.filter((t) => t.status !== 'COMPLETED').length} Bekleyen Görev
                  </span>
                  <span className="flex items-center gap-1 font-mono-code text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {teamTasks.filter((t) => t.status === 'COMPLETED').length} Tamamlanan
                  </span>
                </div>

                {isTeamManager && (
                  <button
                    onClick={() => {
                      setInvitingTeam(team);
                      setInviteEmail('');
                      setInviteFeedback(null);
                    }}
                    className="px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>E-Posta ile Davet Et</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE TEAM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-lg rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-950 z-20 flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">Yeni Çalışma Ekibi Oluştur</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Ekip adı, logosu ve çalışma kapsamını belirleyin. Ekip yöneticisi otomatik olarak siz olacaksınız.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer p-1 rounded-md hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
              {/* Team Logo Upload */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">EKİP LOGOSU / GÖRSELİ</label>
                <div className="flex items-center gap-3.5 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                  <div className="relative">
                    {newTeamLogo ? (
                      <img
                        src={newTeamLogo}
                        alt="Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-zinc-700 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-zinc-850 border border-zinc-750 flex items-center justify-center text-zinc-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    {isProcessingImg && (
                      <div className="absolute inset-0 rounded-xl bg-black/70 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="inline-block px-3 py-1.5 rounded-md bg-white text-black hover:bg-zinc-200 text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                      Logo Yükle
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                    {newTeamLogo && (
                      <button
                        type="button"
                        onClick={() => setNewTeamLogo(undefined)}
                        className="block text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        Logoyu Kaldır
                      </button>
                    )}
                    <p className="text-[10px] text-zinc-500">Kare görsel önerilir (JPG, PNG)</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">EKİP ADI *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Mobil Geliştirme Grubu, Siber Güvenlik Birimi..."
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">AÇIKLAMA</label>
                <textarea
                  rows={3}
                  placeholder="Ekibin sorumluluk alanı, hedefleri veya çalışma kapsamı..."
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none text-xs"
                />
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400">
                💡 Ekibi oluşturduktan sonra ekip kartındaki <strong>"E-Posta ile Davet Et"</strong> butonuna basarak üyelerinizi doğrudan e-posta adresleri üzerinden davet edebilirsiniz.
              </div>

              <div className="pt-3 border-t border-zinc-900 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isProcessingImg}
                  className="px-4 py-1.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isCreating ? 'Oluşturuluyor...' : 'Ekibi Oluştur'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TEAM MODAL & TEAM ROLE MANAGEMENT */}
      {editingTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-lg rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-950 z-20 flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">Ekibi Düzenle & Üye Rolleri</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  "{editingTeam.name}" ekibinin bilgilerini, görselini ve üyelerin yönetici/üye yetkilerini düzenleyin.
                </p>
              </div>
              <button
                onClick={() => setEditingTeam(null)}
                className="text-zinc-500 hover:text-white cursor-pointer p-1 rounded-md hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeamEdit} className="space-y-4 text-xs">
              {/* Edit Logo */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">EKİP LOGOSU / GÖRSELİ</label>
                <div className="flex items-center gap-3.5 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                  <div className="relative">
                    {editLogo ? (
                      <img
                        src={editLogo}
                        alt="Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-zinc-700 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-zinc-850 border border-zinc-750 flex items-center justify-center text-zinc-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    {isProcessingImg && (
                      <div className="absolute inset-0 rounded-xl bg-black/70 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="inline-block px-3 py-1.5 rounded-md bg-white text-black hover:bg-zinc-200 text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                      Görsel Değiştir
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, true)}
                        className="hidden"
                      />
                    </label>
                    {editLogo && (
                      <button
                        type="button"
                        onClick={() => setEditLogo(undefined)}
                        className="block text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        Görseli Kaldır
                      </button>
                    )}
                    <p className="text-[10px] text-zinc-500">JPG, PNG veya WEBP</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">EKİP ADI *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">AÇIKLAMA</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none text-xs"
                />
              </div>

              {/* Members in this team with Role Toggle and Removal */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-300 font-medium flex items-center gap-1.5">
                    <UserCog className="w-3.5 h-3.5 text-zinc-400" />
                    EKİPTEKİ ÜYELER & ROLLER ({editingTeam.memberIds.length})
                  </label>
                  <span className="text-[10px] text-zinc-500">Yetkileri sadece ekip yöneticisi değiştirebilir</span>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                  {users
                    .filter((u) => editingTeam.memberIds.includes(u.id))
                    .map((mem) => {
                      const isMgr = editingTeam.managerIds.includes(mem.id);
                      const isCreator = editingTeam.createdBy === mem.id;

                      return (
                        <div
                          key={mem.id}
                          className="p-2.5 rounded-md flex items-center justify-between bg-zinc-950 border border-zinc-850 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            {mem.avatarUrl ? (
                              <img src={mem.avatarUrl} alt={mem.name} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase"
                                style={{ backgroundColor: mem.avatarColor || '#0070f3' }}
                              >
                                {mem.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-white font-medium">{mem.name}</span>
                                {isCreator && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/50 font-mono-code">
                                    Kurucu
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-500 font-mono-code">{mem.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Role Selector */}
                            <select
                              value={isMgr ? 'MANAGER' : 'MEMBER'}
                              disabled={mem.id === currentUser?.id && isCreator}
                              onChange={(e) => {
                                const newRole = e.target.value as 'MANAGER' | 'MEMBER';
                                handleChangeMemberRole(editingTeam, mem.id, newRole);
                              }}
                              className={`text-[11px] px-2 py-1 rounded border outline-none cursor-pointer ${
                                isMgr
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                  : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                              }`}
                            >
                              <option value="MEMBER">Üye</option>
                              <option value="MANAGER">Yönetici</option>
                            </select>

                            {mem.id !== currentUser?.id && !isCreator && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(editingTeam, mem.id)}
                                className="text-[10px] px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-300 cursor-pointer"
                                title="Ekipten Çıkar"
                              >
                                Çıkar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-900 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || isProcessingImg}
                  className="px-4 py-1.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isSavingEdit ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEND EMAIL-BASED TEAM INVITATION MODAL */}
      {invitingTeam && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
          <div className="my-auto relative w-full max-w-md rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-950 z-20 flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">E-Posta ile Ekip Daveti Gönder</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  "{invitingTeam.name}" ekibine katılmaları için tam e-posta adresi ile davet iletin.
                </p>
              </div>
              <button
                onClick={() => setInvitingTeam(null)}
                className="text-zinc-500 hover:text-white cursor-pointer p-1 rounded-md hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteFeedback && (
              <div
                className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                  inviteFeedback.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-red-950/40 border-red-800 text-red-300'
                }`}
              >
                {inviteFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{inviteFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSendEmailInvite} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  DAVET EDİLECEK E-POSTA ADRESİ *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="kullanici@sirket.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 outline-none focus:border-zinc-600 text-xs font-mono-code"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
                  Güvenlik gereği kullanıcı araması yapılmaz. Tam e-posta adresi yazılmalıdır. Kullanıcı daveti onayladığında yönetici onayınıza düşecektir.
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-900 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInvitingTeam(null)}
                  className="px-3.5 py-1.5 rounded-md bg-zinc-900 text-zinc-300 hover:text-white cursor-pointer"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  disabled={!inviteEmail.trim() || isSendingInvite}
                  className="px-4 py-1.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingInvite ? 'Gönderiliyor...' : 'Davet Gönder'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
