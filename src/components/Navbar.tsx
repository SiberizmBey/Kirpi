/**
 * Kirpi Task & Team Hub - Vercel Minimalist Navbar
 * Real-time Team Invitations, Settings, Profile & Isolated Counters
 */

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  MessageSquare,
  Users,
  Plus,
  ChevronDown,
  LogIn,
  LogOut,
  Shield,
  User,
  Settings,
  Layers,
  Bell,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { AppUser, Team, TeamInvitation } from '../types';
import { firebaseService } from '../services/firebaseService';

interface NavbarProps {
  activeTab: 'tasks' | 'chat' | 'teams' | 'team';
  setActiveTab: (tab: 'tasks' | 'chat' | 'teams' | 'team') => void;
  currentUser: AppUser | null;
  onOpenCreateTask: () => void;
  onOpenAuth: () => void;
  onOpenProfileEdit: () => void;
  onOpenSettings: () => void;
  users: AppUser[];
  teams: Team[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenCreateTask,
  onOpenAuth,
  onOpenProfileEdit,
  onOpenSettings,
  users,
  teams,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isInvitesOpen, setIsInvitesOpen] = useState(false);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);

  // Listen for user invitations in real-time by user email or id
  useEffect(() => {
    if (!currentUser || !currentUser.email) {
      setInvitations([]);
      return;
    }

    const unsub = firebaseService.subscribeInvitations(currentUser.email, (invList) => {
      // Filter out rejected or accepted ones that are done
      setInvitations(
        invList.filter(
          (inv) =>
            inv.status === 'PENDING_USER_ACCEPT' || inv.status === 'PENDING_MANAGER_APPROVAL'
        )
      );
    });

    return () => unsub();
  }, [currentUser?.email, currentUser?.id]);

  const myTeams = currentUser
    ? teams.filter(
        (t) =>
          t.memberIds.includes(currentUser.id) ||
          t.managerIds.includes(currentUser.id) ||
          t.createdBy === currentUser.id
      )
    : [];

  const managedTeamsCount = currentUser
    ? myTeams.filter((t) => t.managerIds.includes(currentUser.id) || t.createdBy === currentUser.id).length
    : 0;

  const myTeammates = users.filter(
    (u) =>
      u.id === currentUser?.id ||
      myTeams.some((t) => t.memberIds.includes(u.id) || t.managerIds.includes(u.id))
  );

  const handleSignOut = async () => {
    await firebaseService.signOutUser();
    setIsUserMenuOpen(false);
  };

  const handleAcceptInvite = async (inv: TeamInvitation) => {
    if (!currentUser) return;
    try {
      await firebaseService.respondToTeamInvitation(inv.id, true, currentUser);
    } catch (e: any) {
      console.error('Accept invite error:', e);
      alert(e.message || 'Davet kabul edilirken bir hata oluştu.');
    }
  };

  const handleRejectInvite = async (inv: TeamInvitation) => {
    if (!currentUser) return;
    try {
      await firebaseService.respondToTeamInvitation(inv.id, false, currentUser);
    } catch (e: any) {
      console.error('Reject invite error:', e);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-black/85 backdrop-blur-md font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand + Navigation Tabs */}
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Vercel-style Logo */}
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => setActiveTab('tasks')}
          >
            <div className="w-7 h-7 bg-white text-black flex items-center justify-center rounded-lg shadow-sm">
              <svg width="14" height="14" viewBox="0 0 76 65" fill="none">
                <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="#000000" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">Kirpi</span>
          </div>

          {/* Navigation Tab Links */}
          <nav className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-zinc-900 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Görev Dağıtımı</span>
            </button>

            <button
              onClick={() => setActiveTab('teams')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'teams'
                  ? 'bg-zinc-900 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ekipler ({currentUser ? myTeams.length : 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-zinc-900 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Takım Sohbeti</span>
            </button>

            <button
              onClick={() => setActiveTab('team')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-zinc-900 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kadro ({currentUser ? myTeammates.length : 0})</span>
            </button>
          </nav>
        </div>

        {/* Right: Actions, Invites, Settings & User Menu */}
        <div className="flex items-center gap-2.5">
          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-md border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Ayarlar & Güncelleme Kontrolü"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Invitations Notification Bell */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setIsInvitesOpen(!isInvitesOpen)}
                className="relative p-2 rounded-md border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Ekip Davetleri"
              >
                <Bell className="w-4 h-4" />
                {invitations.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {invitations.length}
                  </span>
                )}
              </button>

              {/* Invitations Popover */}
              {isInvitesOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-3 z-50 animate-fade-in font-sans space-y-2.5">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Gelen Ekip Davetleri ({invitations.length})</span>
                    </span>
                    <button
                      onClick={() => setIsInvitesOpen(false)}
                      className="text-zinc-500 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {invitations.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-3 text-center">
                      Bekleyen yeni ekip davetiniz bulunmuyor.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {invitations.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {inv.teamLogoUrl ? (
                              <img
                                src={inv.teamLogoUrl}
                                alt={inv.teamName}
                                className="w-7 h-7 rounded-lg object-cover border border-zinc-700 flex-shrink-0"
                              />
                            ) : (
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white uppercase flex-shrink-0"
                                style={{ backgroundColor: inv.teamColor || '#0070f3' }}
                              >
                                {inv.teamName.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-white truncate">{inv.teamName}</p>
                              <p className="text-[10px] text-zinc-400">
                                Davet Eden: {inv.invitedByName}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            {inv.status === 'PENDING_MANAGER_APPROVAL' ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300">
                                Yönetici Onayı Bekleniyor
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRejectInvite(inv)}
                                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                                >
                                  Reddet
                                </button>
                                <button
                                  onClick={() => handleAcceptInvite(inv)}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Kabul Et</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* New Task Button */}
          {currentUser && (
            <button
              onClick={onOpenCreateTask}
              className="px-3 py-1.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Yeni Görev</span>
              <span className="sm:hidden">Ekle</span>
            </button>
          )}

          {/* User Account / Profile Menu */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1 rounded-md border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-all text-xs cursor-pointer"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-5 h-5 rounded-full object-cover shadow-sm border border-zinc-700"
                  />
                ) : (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm"
                    style={{ backgroundColor: currentUser.avatarColor || '#0070f3' }}
                  >
                    {currentUser.name.charAt(0)}
                  </div>
                )}
                <div className="hidden md:flex flex-col text-left">
                  <span className="font-medium text-white truncate max-w-[110px] leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 leading-tight truncate">
                    {myTeams.length > 0 ? `${myTeams.length} Ekip` : 'Bağımsız'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg bg-zinc-950 border border-zinc-800 shadow-2xl py-2 z-50 animate-fade-in font-sans">
                  <div className="px-3 py-2 border-b border-zinc-900 flex items-center gap-3">
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm"
                        style={{ backgroundColor: currentUser.avatarColor || '#0070f3' }}
                      >
                        {currentUser.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{currentUser.email}</p>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 border-b border-zinc-900 flex items-center justify-between text-[10px]">
                    <span className="text-zinc-400">Ekip Üyelikleri:</span>
                    <span className="text-white font-mono-code">
                      {managedTeamsCount} Yönetici, {Math.max(0, myTeams.length - managedTeamsCount)} Üye
                    </span>
                  </div>

                  <div className="px-2 py-1.5 space-y-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProfileEdit();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Profil & Fotoğraf Düzenle</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Ayarlar & Güncellemeler</span>
                    </button>
                  </div>

                  <div className="border-t border-zinc-900 pt-1.5 px-2">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-red-400 hover:bg-red-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Giriş Yap / Kaydol</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Navigation Bar */}
      <div className="sm:hidden flex items-center justify-around border-t border-zinc-900 bg-zinc-950/60 px-2 py-1.5 text-xs">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-1.5 text-center font-medium rounded cursor-pointer ${
            activeTab === 'tasks' ? 'text-white bg-zinc-900' : 'text-zinc-400'
          }`}
        >
          Görevler
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex-1 py-1.5 text-center font-medium rounded cursor-pointer ${
            activeTab === 'teams' ? 'text-white bg-zinc-900' : 'text-zinc-400'
          }`}
        >
          Ekipler ({currentUser ? myTeams.length : 0})
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-1.5 text-center font-medium rounded cursor-pointer ${
            activeTab === 'chat' ? 'text-white bg-zinc-900' : 'text-zinc-400'
          }`}
        >
          Sohbet
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex-1 py-1.5 text-center font-medium rounded cursor-pointer ${
            activeTab === 'team' ? 'text-white bg-zinc-900' : 'text-zinc-400'
          }`}
        >
          Kadro ({currentUser ? myTeammates.length : 0})
        </button>
      </div>
    </header>
  );
};
