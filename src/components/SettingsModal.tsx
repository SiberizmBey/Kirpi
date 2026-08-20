/**
 * Kirpi Task & Team Hub - Settings, Theme Engine & GitHub Update Checker Modal
 * Features:
 * 1. Application Theme: Karanlık (Dark), Aydınlık (Light), Amoled (OLED), Sistem Takibi
 * 2. Desktop Push Notifications (Masaüstü Bildirimleri) Permission & Test
 * 3. Accurate GitHub Update Checker (https://github.com/SiberizmBey/Kirpi)
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Settings,
  Sun,
  Moon,
  Laptop,
  Sparkles,
  RefreshCw,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  FolderGit2,
  Bell,
  BellRing,
  Volume2,
} from 'lucide-react';
import { AppTheme, AppUser } from '../types';
import { notificationService } from '../utils/notificationService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUser | null;
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

const CURRENT_VERSION = 'v1.0.0';
const GITHUB_REPO = 'SiberizmBey/Kirpi';
const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
}) => {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    () => notificationService.getPermissionStatus()
  );

  const [updateStatus, setUpdateStatus] = useState<{
    checked: boolean;
    state: 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'REPO_NOT_FOUND' | 'NO_RELEASES' | 'ERROR';
    latestVersion?: string;
    releaseNotes?: string;
    downloadUrl?: string;
    message?: string;
  }>({
    checked: false,
    state: 'UP_TO_DATE',
  });

  useEffect(() => {
    if (isOpen) {
      setNotificationPermission(notificationService.getPermissionStatus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestNotification = async () => {
    const perm = await notificationService.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      notificationService.send('Kirpi Hub Masaüstü Bildirimleri Aktif!', {
        body: 'Yeni görevler, ekip güncellemeleri ve sohbet mesajları anlık olarak masaüstünüze iletilecektir.',
      });
    }
  };

  const handleTestNotification = () => {
    notificationService.send('Kirpi Hub Test Bildirimi', {
      body: 'Masaüstü ve sesli bildirimleriniz sorunsuz çalışıyor!',
    });
  };

  const handleCheckUpdate = async () => {
    try {
      setCheckingUpdate(true);

      // 1. Check if repository exists
      const repoRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });

      if (repoRes.status === 404) {
        setUpdateStatus({
          checked: true,
          state: 'REPO_NOT_FOUND',
          message: `GitHub deposu (${GITHUB_REPO}) henüz oluşturulmamış veya herkese açık değil. GitHub'da depoyu oluşturup Release yayınladığınızda yeni sürümler buradan otomatik olarak bildirilecektir.`,
          downloadUrl: GITHUB_REPO_URL,
        });
        return;
      }

      if (!repoRes.ok) {
        const errData = await repoRes.json().catch(() => ({}));
        setUpdateStatus({
          checked: true,
          state: 'ERROR',
          message: errData.message || 'GitHub API bağlantısı kurulamadı.',
          downloadUrl: GITHUB_REPO_URL,
        });
        return;
      }

      // 2. Repository exists, check releases
      const releaseRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });

      if (releaseRes.ok) {
        const release = await releaseRes.json();
        const latestTag = release.tag_name || release.name || CURRENT_VERSION;
        const isNewer = latestTag.trim().toLowerCase() !== CURRENT_VERSION.trim().toLowerCase();

        if (isNewer) {
          setUpdateStatus({
            checked: true,
            state: 'UPDATE_AVAILABLE',
            latestVersion: latestTag,
            releaseNotes: release.body || 'Kirpi için yeni özellikler ve hata düzeltmeleri yayınlandı.',
            downloadUrl: release.html_url || `${GITHUB_REPO_URL}/releases/latest`,
            message: `Yeni sürüm (${latestTag}) hazır! İndirmek için aşağıdaki butona tıklayın.`,
          });
          notificationService.send(`Kirpi Hub Güncellemesi Mevcut (${latestTag})`, {
            body: 'Yeni sürümü indirmek için Ayarlar bölümüne göz atın.',
          });
        } else {
          setUpdateStatus({
            checked: true,
            state: 'UP_TO_DATE',
            latestVersion: CURRENT_VERSION,
            releaseNotes: release.body || 'En son kararlı sürümü kullanıyorsunuz.',
            downloadUrl: release.html_url || GITHUB_REPO_URL,
            message: `Sisteminiz en güncel sürümü (${CURRENT_VERSION}) kullanıyor.`,
          });
        }
      } else {
        // Repo exists, but no releases yet
        setUpdateStatus({
          checked: true,
          state: 'NO_RELEASES',
          message: `GitHub deposu (${GITHUB_REPO}) bulundu ancak henüz yayınlanmış bir Sürüm (Release) bulunmuyor. Mevcut yerel sürüm: ${CURRENT_VERSION}`,
          downloadUrl: `${GITHUB_REPO_URL}/releases`,
        });
      }
    } catch (err: any) {
      setUpdateStatus({
        checked: true,
        state: 'ERROR',
        message: 'GitHub sunucusuna erişilemedi veya internet bağlantısı yok.',
        downloadUrl: GITHUB_REPO_URL,
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleOpenDownload = (url?: string) => {
    const target = url || `${GITHUB_REPO_URL}/releases`;
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[var(--modal-backdrop)] backdrop-blur-md font-sans overflow-y-auto">
      <div className="my-auto relative w-full max-w-lg rounded-xl bg-[var(--bg-modal)] border border-[var(--border-card)] p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-modal)] z-20 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-inner)] border border-[var(--border-card)] flex items-center justify-center text-[var(--text-primary)]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Uygulama Ayarları</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Tema tercihleri, masaüstü bildirimleri ve sürüm kontrolü</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Theme Preferences */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider font-mono-code">
              GÖRÜNÜM TEMASI
            </label>
            <span className="text-[11px] text-[var(--text-secondary)]">
              {currentTheme === 'DARK'
                ? 'Karanlık Mod'
                : currentTheme === 'LIGHT'
                ? 'Aydınlık Mod'
                : currentTheme === 'AMOLED'
                ? 'Amoled Mod (OLED)'
                : 'Sistem Takibi'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => onThemeChange('DARK')}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                currentTheme === 'DARK'
                  ? 'border-purple-500 bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm ring-1 ring-purple-500/30'
                  : 'border-[var(--border-card)] bg-[var(--bg-inner)] text-[var(--text-secondary)] hover:border-purple-500/50'
              }`}
            >
              <Moon className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">Karanlık</p>
                <p className="text-[10px] text-[var(--text-muted)]">Özel Palet</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onThemeChange('LIGHT')}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                currentTheme === 'LIGHT'
                  ? 'border-purple-500 bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm ring-1 ring-purple-500/30'
                  : 'border-[var(--border-card)] bg-[var(--bg-inner)] text-[var(--text-secondary)] hover:border-purple-500/50'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">Aydınlık</p>
                <p className="text-[10px] text-[var(--text-muted)]">Aydınlık Mod</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onThemeChange('AMOLED')}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                currentTheme === 'AMOLED'
                  ? 'border-purple-500 bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm ring-1 ring-purple-500/30'
                  : 'border-[var(--border-card)] bg-[var(--bg-inner)] text-[var(--text-secondary)] hover:border-purple-500/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">Amoled</p>
                <p className="text-[10px] text-[var(--text-muted)]">Saf Siyah</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onThemeChange('SYSTEM')}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                currentTheme === 'SYSTEM'
                  ? 'border-purple-500 bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm ring-1 ring-purple-500/30'
                  : 'border-[var(--border-card)] bg-[var(--bg-inner)] text-[var(--text-secondary)] hover:border-purple-500/50'
              }`}
            >
              <Laptop className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">Sistem</p>
                <p className="text-[10px] text-[var(--text-muted)]">Cihaz Ayarı</p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Desktop Push Notifications */}
        <div className="p-4 rounded-xl bg-[var(--bg-inner)] border border-[var(--border-card)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-500" />
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-primary)]">Masaüstü Bildirimleri</h4>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Mesajlar, yeni görevler ve durum güncellemeleri
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {notificationPermission === 'granted' ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Aktif
                  </span>
                  <button
                    onClick={handleTestNotification}
                    className="px-2.5 py-1 rounded bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[var(--border-hover)] text-[var(--text-primary)] text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Test Et
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRequestNotification}
                  className="px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>İzin Ver</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. GitHub Update Checker */}
        <div className="p-4 rounded-xl bg-[var(--bg-inner)] border border-[var(--border-card)] space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[var(--text-muted)]" />
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-primary)]">GitHub Güncelleme Kontrolü</h4>
                <p className="text-[11px] text-[var(--text-secondary)] font-mono-code mt-0.5">
                  Repo: {GITHUB_REPO} (Mevcut: {CURRENT_VERSION})
                </p>
              </div>
            </div>

            <button
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className="px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
              <span>{checkingUpdate ? 'Kontrol Ediliyor...' : 'Güncellemeleri Denetle'}</span>
            </button>
          </div>

          {/* Update Result Display */}
          {updateStatus.checked && (
            <div
              className={`p-3 rounded-lg border text-xs space-y-2.5 animate-fade-in ${
                updateStatus.state === 'UPDATE_AVAILABLE'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                  : updateStatus.state === 'REPO_NOT_FOUND' || updateStatus.state === 'NO_RELEASES'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
                  : updateStatus.state === 'UP_TO_DATE'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : 'bg-red-500/10 border-red-500/40 text-red-500'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {updateStatus.state === 'UPDATE_AVAILABLE' ? (
                    <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : updateStatus.state === 'REPO_NOT_FOUND' || updateStatus.state === 'NO_RELEASES' ? (
                    <FolderGit2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  ) : updateStatus.state === 'UP_TO_DATE' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}

                  <span className="font-semibold text-xs text-[var(--text-primary)]">
                    {updateStatus.state === 'UPDATE_AVAILABLE'
                      ? `Yeni Sürüm Mevcut: ${updateStatus.latestVersion}`
                      : updateStatus.state === 'REPO_NOT_FOUND'
                      ? 'GitHub Deposu Henüz Oluşturulmamış'
                      : updateStatus.state === 'NO_RELEASES'
                      ? 'Depoda Henüz Sürüm (Release) Yok'
                      : updateStatus.state === 'UP_TO_DATE'
                      ? `Sisteminiz Güncel (${CURRENT_VERSION})`
                      : 'Bağlantı Hatası'}
                  </span>
                </div>

                <a
                  href={updateStatus.downloadUrl || GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 font-mono-code underline"
                >
                  GitHub <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {updateStatus.message && (
                <p className="text-[11px] leading-relaxed bg-[var(--bg-modal)] p-2.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                  {updateStatus.message}
                </p>
              )}

              {updateStatus.releaseNotes && updateStatus.state === 'UPDATE_AVAILABLE' && (
                <div className="p-2.5 rounded bg-[var(--bg-modal)] border border-emerald-500/30 space-y-1">
                  <p className="text-[10px] uppercase font-mono-code text-emerald-500 font-semibold">
                    SÜRÜM NOTLARI:
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] whitespace-pre-line">
                    {updateStatus.releaseNotes}
                  </p>
                </div>
              )}

              {updateStatus.state === 'UPDATE_AVAILABLE' && (
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => handleOpenDownload(updateStatus.downloadUrl)}
                    className="px-3.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Güncellemeyi İndir ({updateStatus.latestVersion})</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. About & Repository Info */}
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
          <span>Kirpi Task & Team Hub • {CURRENT_VERSION}</span>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] flex items-center gap-1"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
};
