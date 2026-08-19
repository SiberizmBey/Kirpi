/**
 * Kirpi Task & Team Hub - Custom Frameless Desktop Titlebar
 * Replaces default OS titlebar with custom dark/light theme controls,
 * window buttons (Minimize, Maximize/Fullscreen, Close), active team badge,
 * and live system connectivity indicator.
 */

import React, { useState, useEffect } from 'react';
import {
  Minus,
  Square,
  Copy,
  X,
  Shield,
  Activity,
  Layers,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AppUser, Team } from '../types';
import { notificationService } from '../utils/notificationService';

interface DesktopTitlebarProps {
  currentUser: AppUser | null;
  activeTeam?: Team | null;
  onOpenSettings?: () => void;
}

export const DesktopTitlebar: React.FC<DesktopTitlebarProps> = ({
  currentUser,
  activeTeam,
  onOpenSettings,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen toggle error:', err);
    }
  };

  const handleMinimize = () => {
    // In web environment, we can provide subtle feedback
    notificationService.send('Kirpi Hub', {
      body: 'Uygulama arka planda çalışmaya devam ediyor.',
    });
  };

  const handleClose = () => {
    if (confirm('Kirpi Hub uygulamasını kapatmak istiyor musunuz?')) {
      window.close();
    }
  };

  return (
    <header className="h-8 select-none flex items-center justify-between px-3 text-xs bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] transition-colors z-50">
      {/* Left: App Icon & Title */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-purple-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
          K
        </div>
        <span className="font-semibold text-xs tracking-tight text-[var(--text-primary)]">
          Kirpi Hub
        </span>
        <span className="hidden sm:inline text-[10px] text-[var(--text-muted)] font-mono-code">
          v1.0.0
        </span>

        {/* Active Team Pill if selected */}
        {activeTeam && (
          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent-border)] text-[var(--accent-text)] text-[10px]">
            <Layers className="w-2.5 h-2.5" />
            <span className="font-medium truncate max-w-[120px]">{activeTeam.name}</span>
          </div>
        )}
      </div>

      {/* Center: Window Drag Area / Status */}
      <div className="flex-1 flex items-center justify-center mx-4 h-full">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-mono-code">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
            }`}
          />
          <span className="hidden lg:inline">{isOnline ? 'Sistem Çevrimiçi' : 'Bağlantı Yok'}</span>
        </div>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={handleMinimize}
          title="Simge Durumuna Küçült"
          className="w-7 h-6 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleToggleFullscreen}
          title={isFullscreen ? 'Pencereyi Küçült' : 'Tam Ekran Yap'}
          className="w-7 h-6 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
        >
          {isFullscreen ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
        </button>

        <button
          onClick={handleClose}
          title="Kapat"
          className="w-7 h-6 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
