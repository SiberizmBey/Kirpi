/**
 * Kirpi - Profile & Real Avatar Upload Modal (Firestore)
 * High-performance compressed image uploads, real-time sync & custom usernames
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Shield, User, Camera, AtSign, Trash2, Loader2 } from 'lucide-react';
import { AppUser, UserRole } from '../types';
import { firebaseService } from '../services/firebaseService';
import { compressImage } from '../utils/imageCompressor';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [title, setTitle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      setTitle(currentUser.title || '');
      setAvatarUrl(currentUser.avatarUrl);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImg(true);
      const compressedDataUrl = await compressImage(file, {
        maxWidth: 256,
        maxHeight: 256,
        quality: 0.88,
        cropToSquare: true,
      });
      setAvatarUrl(compressedDataUrl);
    } catch (err: any) {
      alert(err.message || 'Fotoğraf işlenirken bir hata oluştu.');
    } finally {
      setIsProcessingImg(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSaving(true);
      await firebaseService.updateUserProfile(currentUser.id, {
        name: name.trim(),
        username: username.trim() || undefined,
        title: title.trim() || 'Ekip Üyesi',
        avatarUrl: avatarUrl || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Profile save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[var(--modal-backdrop)] backdrop-blur-md font-sans overflow-y-auto">
      <div className="my-auto relative w-full max-w-md rounded-xl bg-[var(--bg-modal)] border border-[var(--border-card)] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--bg-modal)] z-20 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Profil Düzenle</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Görünen adınızı, kullanıcı adınızı, unvanınızı ve profil resminizi güncelleyin.
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Avatar Upload Preview */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-inner)] border border-[var(--border-card)]">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[var(--border-subtle)] shadow-md"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white uppercase shadow-md"
                  style={{ backgroundColor: currentUser.avatarColor || '#a855f7' }}
                >
                  {name.charAt(0) || 'U'}
                </div>
              )}

              {isProcessingImg && (
                <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}

              <label className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white">
                <Camera className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 space-y-1.5">
              <label className="inline-block px-3 py-1.5 rounded-md bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 text-xs font-semibold cursor-pointer transition-all shadow-sm">
                Fotoğraf Yükle
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(undefined)}
                  className="block text-[11px] text-red-500 hover:text-red-400 cursor-pointer"
                >
                  Fotoğrafı Kaldır
                </button>
              )}
              <p className="text-[10px] text-[var(--text-muted)]">JPG, PNG, WEBP (Otomatik optimize edilir)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] font-medium mb-1">GÖRÜNEN AD & SOYAD *</label>
              <input
                type="text"
                required
                placeholder="Adınız ve Soyadınız"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] font-medium mb-1">KULLANICI ADI</label>
              <input
                type="text"
                placeholder="ahmet_dev"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 outline-none text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] font-medium mb-1">UNVAN / POZİSYON</label>
            <input
              type="text"
              placeholder="Örn: Senior Frontend Architect, Proje Yöneticisi..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-purple-500 outline-none text-xs"
            />
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md bg-[var(--bg-inner)] border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSaving || isProcessingImg}
              className="px-4 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
