/**
 * Kirpi Task & Team Hub - Email & Username Authentication Modal
 * Simple, Clean Registration (No global account role - roles are strictly team-scoped)
 */

import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  X,
  User,
  AtSign,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import { compressImage } from '../utils/imageCompressor';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'REGISTER' | 'LOGIN'>('REGISTER');

  // Register Fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('Ekip Üyesi');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Login Fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImage(file, {
        maxWidth: 256,
        maxHeight: 256,
        quality: 0.88,
        cropToSquare: true,
      });
      setAvatarUrl(compressedDataUrl);
    } catch (err: any) {
      alert(err.message || 'Profil fotoğrafı işlenemedi.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      setIsLoading(true);
      setErrorMsg(null);

      await firebaseService.registerWithEmail({
        name: name.trim(),
        username: username.trim() || email.split('@')[0],
        email: email.trim().toLowerCase(),
        title: title.trim() || 'Ekip Üyesi',
        avatarUrl,
      });

      onClose();
    } catch (err: any) {
      console.error('Register error:', err);
      setErrorMsg(err?.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) return;

    try {
      setIsLoading(true);
      setErrorMsg(null);

      await firebaseService.loginWithEmailOrUsername(loginIdentifier.trim());
      onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err?.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans overflow-y-auto">
      <div className="my-auto relative w-full max-w-lg rounded-xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-950 z-20 flex items-center justify-between border-b border-zinc-900 pb-3 pt-0.5">
          <div>
            <h3 className="text-base font-semibold text-white">
              {mode === 'REGISTER' ? 'Hesap Oluştur & Kayıt Ol' : 'Giriş Yap'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {mode === 'REGISTER'
                ? 'Hesabınızı oluşturun; ekip oluşturduğunuzda otomatik yönetici olursunuz.'
                : 'E-posta veya kullanıcı adınızla oturum açın.'}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white cursor-pointer p-1 rounded-md hover:bg-zinc-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Kayıt Ol vs Giriş Yap */}
        <div className="grid grid-cols-2 p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setErrorMsg(null);
            }}
            className={`py-2 font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'REGISTER'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Kayıt Ol</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setErrorMsg(null);
            }}
            className={`py-2 font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'LOGIN'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Giriş Yap</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* REGISTER FORM */}
        {mode === 'REGISTER' ? (
          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            {/* Avatar Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-14 h-14 rounded-full object-cover border border-zinc-700"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-400 border border-zinc-700 uppercase">
                  {name.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex-1 space-y-1">
                <label className="inline-block px-3 py-1.5 rounded-md bg-white text-black hover:bg-zinc-200 text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                  Fotoğraf Seç
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
                    className="block text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    Kaldır
                  </button>
                )}
                <p className="text-[10px] text-zinc-500">İsteğe bağlı profil resmi (Maks 2MB)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">AD VE SOYAD *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ahmet Yılmaz"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">KULLANICI ADI</label>
                <div className="relative">
                  <AtSign className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ahmet_dev"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">E-POSTA ADRESİ *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="ahmet@sirket.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">ŞİFRE *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">UNVAN / MESLEKİ POZİSYON</label>
              <input
                type="text"
                placeholder="Örn: Senior Frontend Developer, UI/UX Designer..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none text-xs"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>{isLoading ? 'Kaydediliyor...' : 'Hesabı Oluştur & Giriş Yap'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* LOGIN FORM */
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                E-POSTA VEYA KULLANICI ADI *
              </label>
              <div className="relative">
                <AtSign className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="ahmet@sirket.com veya ahmet_dev"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">ŞİFRE *</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 outline-none text-xs"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                <span>{isLoading ? 'Giriş Yapılıyor...' : 'Oturum Aç'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
