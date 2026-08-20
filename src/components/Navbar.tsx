/**
 * Kirpi Task & Team Hub - Modern Seamless Navbar
 * Includes Real-time Team Invitations, Settings, Profile & Window Controls (Minimize, Maximize, Close)
 * Fully Theme-Adaptive (Dark, Light, Amoled)
 */

import React, { useState, useEffect } from "react";
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
    Minus,
    Square,
    Copy,
} from "lucide-react";
import { AppUser, Team, TeamInvitation } from "../types";
import { firebaseService } from "../services/firebaseService";
import { notificationService } from "../utils/notificationService";

interface NavbarProps {
    activeTab: "tasks" | "chat" | "teams" | "team";
    setActiveTab: (tab: "tasks" | "chat" | "teams" | "team") => void;
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
    const [isFullscreen, setIsFullscreen] = useState(false);

    const isElectron =
        typeof window !== "undefined" && !!window.electronAPI?.isElectron;

    // Window state tracking (Browser fullscreen or Electron maximized)
    useEffect(() => {
        if (isElectron && window.electronAPI) {
            window.electronAPI
                .isMaximized()
                .then((max) => setIsFullscreen(max));
            const unsubscribe = window.electronAPI.onMaximizedChange(
                (isMax) => {
                    setIsFullscreen(isMax);
                },
            );
            return () => {
                unsubscribe();
            };
        } else {
            const handleFullscreenChange = () => {
                setIsFullscreen(!!document.fullscreenElement);
            };
            document.addEventListener(
                "fullscreenchange",
                handleFullscreenChange,
            );
            return () => {
                document.removeEventListener(
                    "fullscreenchange",
                    handleFullscreenChange,
                );
            };
        }
    }, [isElectron]);

    // Listen for user invitations in real-time by user email or id
    useEffect(() => {
        if (!currentUser || !currentUser.email) {
            setInvitations([]);
            return;
        }

        const unsub = firebaseService.subscribeInvitations(
            currentUser.email,
            (invList) => {
                setInvitations(
                    invList.filter(
                        (inv) =>
                            inv.status === "PENDING_USER_ACCEPT" ||
                            inv.status === "PENDING_MANAGER_APPROVAL",
                    ),
                );
            },
        );

        return () => unsub();
    }, [currentUser?.email, currentUser?.id]);

    const myTeams = currentUser
        ? teams.filter(
              (t) =>
                  t.memberIds.includes(currentUser.id) ||
                  t.managerIds.includes(currentUser.id) ||
                  t.createdBy === currentUser.id,
          )
        : [];

    const isManagerInAnyTeam = currentUser
        ? myTeams.some(
              (t) =>
                  t.managerIds?.includes(currentUser.id) ||
                  t.createdBy === currentUser.id,
          )
        : false;

    const managedTeamsCount = currentUser
        ? myTeams.filter(
              (t) =>
                  t.managerIds.includes(currentUser.id) ||
                  t.createdBy === currentUser.id,
          ).length
        : 0;

    const myTeammates = users.filter(
        (u) =>
            u.id === currentUser?.id ||
            myTeams.some(
                (t) =>
                    t.memberIds.includes(u.id) || t.managerIds.includes(u.id),
            ),
    );

    const handleSignOut = async () => {
        await firebaseService.signOutUser();
        setIsUserMenuOpen(false);
    };

    const handleAcceptInvite = async (inv: TeamInvitation) => {
        if (!currentUser) return;
        try {
            await firebaseService.respondToTeamInvitation(
                inv.id,
                true,
                currentUser,
            );
        } catch (e: any) {
            console.error("Accept invite error:", e);
            alert(e.message || "Davet kabul edilirken bir hata oluştu.");
        }
    };

    const handleRejectInvite = async (inv: TeamInvitation) => {
        if (!currentUser) return;
        try {
            await firebaseService.respondToTeamInvitation(
                inv.id,
                false,
                currentUser,
            );
        } catch (e: any) {
            console.error("Reject invite error:", e);
        }
    };

    // Window Controls Handlers (Native Electron + Browser Fallback)
    const handleToggleFullscreen = async () => {
        if (isElectron && window.electronAPI) {
            window.electronAPI.maximize();
            return;
        }

        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.warn("Fullscreen toggle error:", err);
        }
    };

    const handleMinimize = () => {
        if (isElectron && window.electronAPI) {
            window.electronAPI.minimize();
            return;
        }

        notificationService.send("Kirpi Hub", {
            body: "Uygulama arka planda sorunsuz çalışıyor.",
        });
    };

    const handleClose = () => {
        if (isElectron && window.electronAPI) {
            window.electronAPI.close();
            return;
        }

        if (confirm("Kirpi Hub uygulamasını kapatmak istiyor musunuz?")) {
            window.close();
        }
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b border-[var(--border-card)] bg-[var(--bg-island)] backdrop-blur-md font-sans transition-colors electron-drag-region select-none">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
                {/* Left: Brand + Navigation Tabs */}
                <div className="flex items-center gap-4 sm:gap-7 min-w-0 electron-no-drag">
                    {/* Logo */}
                    <div
                        className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
                        onClick={() => setActiveTab("tasks")}
                    >
                        <div className="w-7 h-7 flex items-center justify-center">
                            <img
                                src="../../public/icon.png"
                                alt="Icon"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)]">
                            Kirpi
                        </span>
                    </div>

                    {/* Navigation Tab Links */}
                    <nav className="hidden sm:flex items-center gap-1">
                        <button
                            onClick={() => setActiveTab("tasks")}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                                activeTab === "tasks"
                                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-card)] shadow-xs"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                            }`}
                        >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Görev Dağıtımı</span>
                        </button>

                        <button
                            onClick={() => setActiveTab("teams")}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                                activeTab === "teams"
                                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-card)] shadow-xs"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>
                                Ekipler ({currentUser ? myTeams.length : 0})
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab("chat")}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                                activeTab === "chat"
                                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-card)] shadow-xs"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                            }`}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Takım Sohbeti</span>
                        </button>

                        <button
                            onClick={() => setActiveTab("team")}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                                activeTab === "team"
                                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-card)] shadow-xs"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            <span>
                                Kadro ({currentUser ? myTeammates.length : 0})
                            </span>
                        </button>
                    </nav>
                </div>

                {/* Right: Actions, Invites, Settings, Profile & Window Controls */}
                <div className="flex items-center gap-2 flex-shrink-0 electron-no-drag">
                    {/* Settings Button */}
                    <button
                        onClick={onOpenSettings}
                        className="p-2 rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Ayarlar & Güncelleme Kontrolü"
                    >
                        <Settings className="w-4 h-4" />
                    </button>

                    {/* Invitations Notification Bell */}
                    {currentUser && (
                        <div className="relative">
                            <button
                                onClick={() => setIsInvitesOpen(!isInvitesOpen)}
                                className="relative p-2 rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                                title="Ekip Davetleri"
                            >
                                <Bell className="w-4 h-4" />
                                {invitations.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse shadow-sm">
                                        {invitations.length}
                                    </span>
                                )}
                            </button>

                            {/* Invitations Popover */}
                            {isInvitesOpen && (
                                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[var(--bg-modal)] border border-[var(--border-card)] shadow-2xl p-3 z-50 animate-fade-in font-sans space-y-2.5">
                                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                                        <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                                            <Bell className="w-3.5 h-3.5 text-purple-400" />
                                            <span>
                                                Gelen Ekip Davetleri (
                                                {invitations.length})
                                            </span>
                                        </span>
                                        <button
                                            onClick={() =>
                                                setIsInvitesOpen(false)
                                            }
                                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {invitations.length === 0 ? (
                                        <p className="text-xs text-[var(--text-muted)] py-3 text-center">
                                            Bekleyen yeni ekip davetiniz
                                            bulunmuyor.
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {invitations.map((inv) => (
                                                <div
                                                    key={inv.id}
                                                    className="p-2.5 rounded-lg bg-[var(--bg-inner)] border border-[var(--border-card)] space-y-2 text-xs"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {inv.teamLogoUrl ? (
                                                            <img
                                                                src={
                                                                    inv.teamLogoUrl
                                                                }
                                                                alt={
                                                                    inv.teamName
                                                                }
                                                                className="w-7 h-7 rounded-lg object-cover border border-[var(--border-input)] flex-shrink-0"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white uppercase flex-shrink-0 shadow-xs"
                                                                style={{
                                                                    backgroundColor:
                                                                        inv.teamColor ||
                                                                        "#9333ea",
                                                                }}
                                                            >
                                                                {inv.teamName.charAt(
                                                                    0,
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-semibold text-[var(--text-primary)] truncate">
                                                                {inv.teamName}
                                                            </p>
                                                            <p className="text-[10px] text-[var(--text-secondary)] truncate">
                                                                Davet Eden:{" "}
                                                                {
                                                                    inv.invitedByName
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-end gap-1.5 pt-1">
                                                        {inv.status ===
                                                        "PENDING_MANAGER_APPROVAL" ? (
                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 font-medium">
                                                                Yönetici Onayı
                                                                Bekleniyor
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() =>
                                                                        handleRejectInvite(
                                                                            inv,
                                                                        )
                                                                    }
                                                                    className="px-2.5 py-1 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[11px] font-medium transition-colors cursor-pointer"
                                                                >
                                                                    Reddet
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        handleAcceptInvite(
                                                                            inv,
                                                                        )
                                                                    }
                                                                    className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                                                >
                                                                    <Check className="w-3 h-3 stroke-[3]" />
                                                                    <span>
                                                                        Kabul Et
                                                                    </span>
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

                    {/* New Task Button (Only for Managers / Creators) */}
                    {currentUser && isManagerInAnyTeam && (
                        <button
                            onClick={onOpenCreateTask}
                            className="px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
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
                                onClick={() =>
                                    setIsUserMenuOpen(!isUserMenuOpen)
                                }
                                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1 rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] hover:border-[var(--border-hover)] transition-all text-xs cursor-pointer text-[var(--text-primary)]"
                            >
                                {currentUser.avatarUrl ? (
                                    <img
                                        src={currentUser.avatarUrl}
                                        alt={currentUser.name}
                                        className="w-5 h-5 rounded-full object-cover shadow-sm border border-[var(--border-input)]"
                                    />
                                ) : (
                                    <div
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm"
                                        style={{
                                            backgroundColor:
                                                currentUser.avatarColor ||
                                                "#9333ea",
                                        }}
                                    >
                                        {currentUser.name.charAt(0)}
                                    </div>
                                )}
                                <div className="hidden md:flex flex-col text-left">
                                    <span className="font-medium text-[var(--text-primary)] truncate max-w-[110px] leading-tight">
                                        {currentUser.name}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-secondary)] leading-tight truncate">
                                        {myTeams.length > 0
                                            ? `${myTeams.length} Ekip`
                                            : "Bağımsız"}
                                    </span>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            </button>

                            {/* User Dropdown Menu */}
                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[var(--bg-modal)] border border-[var(--border-card)] shadow-2xl py-2 z-50 animate-fade-in font-sans">
                                    <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center gap-3">
                                        {currentUser.avatarUrl ? (
                                            <img
                                                src={currentUser.avatarUrl}
                                                alt={currentUser.name}
                                                className="w-8 h-8 rounded-full object-cover border border-[var(--border-input)]"
                                            />
                                        ) : (
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm"
                                                style={{
                                                    backgroundColor:
                                                        currentUser.avatarColor ||
                                                        "#9333ea",
                                                }}
                                            >
                                                {currentUser.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                                                {currentUser.name}
                                            </p>
                                            <p className="text-[10px] text-[var(--text-secondary)] truncate">
                                                {currentUser.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] flex items-center justify-between text-[10px]">
                                        <span className="text-[var(--text-secondary)]">
                                            Ekip Üyelikleri:
                                        </span>
                                        <span className="text-[var(--text-primary)] font-mono-code">
                                            {managedTeamsCount} Yönetici,{" "}
                                            {Math.max(
                                                0,
                                                myTeams.length -
                                                    managedTeamsCount,
                                            )}{" "}
                                            Üye
                                        </span>
                                    </div>

                                    <div className="px-2 py-1.5 space-y-1">
                                        <button
                                            onClick={() => {
                                                setIsUserMenuOpen(false);
                                                onOpenProfileEdit();
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                            <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                            <span>
                                                Profil & Fotoğraf Düzenle
                                            </span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setIsUserMenuOpen(false);
                                                onOpenSettings();
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                            <Settings className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                            <span>Ayarlar & Güncellemeler</span>
                                        </button>
                                    </div>

                                    <div className="border-t border-[var(--border-subtle)] pt-1.5 px-2">
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors cursor-pointer font-medium"
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
                            className="px-3.5 py-1.5 rounded-md bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Giriş Yap / Kaydol</span>
                        </button>
                    )}

                    {/* Vertical Divider */}
                    <div className="h-5 w-[1px] bg-[var(--border-input)] mx-1" />

                    {/* Integrated Modern Window Controls: Minimize, Maximize/Restore, Close */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={handleMinimize}
                            title="Simge Durumuna Küçült"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>

                        <button
                            onClick={handleToggleFullscreen}
                            title={
                                isFullscreen
                                    ? "Pencereyi Geri Yükle"
                                    : "Tam Ekran Yap"
                            }
                            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                        >
                            {isFullscreen ? (
                                <Copy className="w-3 h-3 rotate-180" />
                            ) : (
                                <Square className="w-3 h-3" />
                            )}
                        </button>

                        <button
                            onClick={handleClose}
                            title="Kapat"
                            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Tab Navigation Bar */}
            <div className="sm:hidden flex items-center justify-around border-t border-[var(--border-card)] bg-[var(--bg-island)] px-2 py-1.5 text-xs transition-colors">
                <button
                    onClick={() => setActiveTab("tasks")}
                    className={`flex-1 py-1.5 text-center font-medium rounded cursor-pointer ${
                        activeTab === "tasks"
                            ? "text-[var(--text-primary)] bg-[var(--bg-card)] shadow-xs"
                            : "text-[var(--text-secondary)]"
                    }`}
                >
                    Görevler
                </button>
                <button
                    onClick={() => setActiveTab("teams")}
                    className={`flex-1 py-1.5 text-center font-medium rounded cursor-pointer ${
                        activeTab === "teams"
                            ? "text-[var(--text-primary)] bg-[var(--bg-card)] shadow-xs"
                            : "text-[var(--text-secondary)]"
                    }`}
                >
                    Ekipler ({currentUser ? myTeams.length : 0})
                </button>
                <button
                    onClick={() => setActiveTab("chat")}
                    className={`flex-1 py-1.5 text-center font-medium rounded cursor-pointer ${
                        activeTab === "chat"
                            ? "text-[var(--text-primary)] bg-[var(--bg-card)] shadow-xs"
                            : "text-[var(--text-secondary)]"
                    }`}
                >
                    Sohbet
                </button>
                <button
                    onClick={() => setActiveTab("team")}
                    className={`flex-1 py-1.5 text-center font-medium rounded cursor-pointer ${
                        activeTab === "team"
                            ? "text-[var(--text-primary)] bg-[var(--bg-card)] shadow-xs"
                            : "text-[var(--text-secondary)]"
                    }`}
                >
                    Kadro ({currentUser ? myTeammates.length : 0})
                </button>
            </div>
        </header>
    );
};
