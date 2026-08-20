/**
 * Kirpi - Çift Panelli Giriş & Kayıt Ekranı
 * Exact HTML/CSS layout, classes, typography, and animation requested by user.
 * Features: Username/Email + Password Login, Profile Picture + Full Details Register, QR Scan.
 */

import React, { useState } from 'react';
import { firebaseService } from '../services/firebaseService';
import { compressImage } from '../utils/imageCompressor';
import { X, QrCode, Loader2, AlertCircle, Camera, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface AuthViewProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, isModal = false }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regTitle, setRegTitle] = useState('Ekip Üyesi');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) {
      setErrorMessage('Lütfen kullanıcı adınızı veya e-posta adresinizi giriniz.');
      return;
    }

    if (!loginPassword.trim()) {
      setErrorMessage('Lütfen şifrenizi giriniz.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await firebaseService.loginWithEmailOrUsername(
        loginIdentifier.trim(),
        loginPassword.trim()
      );
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err?.message || 'Giriş yapılamadı. Bilgilerinizi kontrol ediniz.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regUsername.trim()) {
      setErrorMessage('Lütfen ad soyad, kullanıcı adı ve e-posta adresinizi eksiksiz giriniz.');
      return;
    }

    if (!regPassword.trim()) {
      setErrorMessage('Lütfen hesabınız için bir şifre belirleyiniz.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await firebaseService.registerWithEmail({
        name: regName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword.trim(),
        title: regTitle.trim() || 'Ekip Üyesi',
        avatarUrl,
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Register error:', err);
      setErrorMessage(err?.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingAvatar(true);
      const compressed = await compressImage(file, {
        maxWidth: 256,
        maxHeight: 256,
        quality: 0.88,
        cropToSquare: true,
      });
      setAvatarUrl(compressed);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Fotoğraf işlenirken hata oluştu.');
    } finally {
      setIsProcessingAvatar(false);
    }
  };

  const handleQuickQrLogin = async () => {
    setIsQrModalOpen(false);
    setErrorMessage('Lütfen mobil Kirpi uygulamanız ile QR kodunu tarayınız veya kullanıcı adı/şifrenizle giriş yapınız.');
  };

  return (
    <div className={`auth-page ${isModal ? 'min-h-auto rounded-3xl overflow-hidden shadow-2xl' : ''}`}>
      {/* --- SOL PANEL (Marka - Masaüstü) --- */}
      <div className="brand-panel">
        <div className="brand-content">
          <img
            className="brand-logo"
            src="/assets/img/kirpi.png"
            alt="Kirpi"
          />

          <h2 className="brand-title">Kirpi</h2>
          <p className="brand-text">
            Powered by <span className="azonix">Antic Valley</span>
          </p>
        </div>
      </div>

      {/* --- SAĞ PANEL (Form) --- */}
      <div className="form-panel">
        <div className="form-wrapper">
          <div className="mobile-logo-container">
            <img
              className="mobile-logo"
              src="/assets/img/kirpi.png"
              alt="Kirpi"
            />
          </div>

          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5 text-left animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {!isRegister ? (
            /* --- GİRİŞ PANELİ (Delta / Kirpi Girişi) --- */
            <>
              <h2 className="brand-title">Delta Girişi</h2>
              <p className="brand-text">Kullanıcı adınızı ve şifrenizi yazınız</p>
              <br />

              <div className="action-buttons">
                <form onSubmit={handleLogin} className="action-buttons">
                  <input
                    type="text"
                    id="username"
                    name="username"
                    className="btn btn-secondary"
                    placeholder="Kullanıcı Adı veya E-Posta"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                  />

                  <div className="relative w-full">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      className="btn btn-secondary pr-12 text-left"
                      placeholder="Şifre"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-alt-color)] hover:text-[var(--text-color)] p-1 cursor-pointer transition-colors"
                      title={showPassword ? "Şifreyi Gizle" : "Şifreyi Göster"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <input
                    type="submit"
                    value={isLoading ? "Giriş Yapılıyor..." : "Devam Et"}
                    className="btn btn-primary"
                    disabled={isLoading}
                  />
                </form>

                <div className="divider">
                  <span>ya da</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="btn btn-primary"
                >
                  <i className="fa-solid fa-qrcode"></i> QR okut
                </button>
              </div>

              <p className="footer-note">
                Hesabın yok mu?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setErrorMessage(null);
                  }}
                  className="underline hover:opacity-80 font-bold"
                >
                  Hesap Oluştur
                </button>
              </p>
            </>
          ) : (
            /* --- KAYIT PANELİ (Delta / Kirpi Kayıt) --- */
            <>
              <h2 className="brand-title">Delta Kayıt</h2>
              <p className="brand-text">Bilgilerinizi doldurunuz</p>
              <br />

              <div className="action-buttons">
                <form onSubmit={handleRegister} className="action-buttons">
                  {/* Avatar Upload Pill */}
                  <div className="flex items-center gap-3.5 p-2.5 rounded-full bg-[var(--secondary)] border border-[var(--border)] text-left hover:border-[var(--border-alpha)] transition-all">
                    <div className="relative">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-12 h-12 rounded-full object-cover border border-[var(--border)] shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[var(--thirdy)] flex items-center justify-center text-[var(--text-alt-color)] border border-[var(--border)]">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                      {isProcessingAvatar && (
                        <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-3">
                      <label className="text-xs font-semibold text-[var(--text-color)] cursor-pointer hover:underline block truncate">
                        {avatarUrl ? 'Fotoğrafı Değiştir' : 'Profil Fotoğrafı Ekle'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-[var(--text-alt-color)] block">İsteğe bağlı (JPG, PNG)</span>
                    </div>
                  </div>

                  <input
                    type="text"
                    required
                    className="btn btn-secondary"
                    placeholder="Ad Soyad *"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />

                  <input
                    type="text"
                    required
                    className="btn btn-secondary"
                    placeholder="Kullanıcı Adı *"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                  />

                  <input
                    type="email"
                    required
                    className="btn btn-secondary"
                    placeholder="E-posta Adresi *"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />

                  <div className="relative w-full">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="btn btn-secondary pr-12 text-left"
                      placeholder="Şifre *"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-alt-color)] hover:text-[var(--text-color)] p-1 cursor-pointer transition-colors"
                      title={showPassword ? "Şifreyi Gizle" : "Şifreyi Göster"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <input
                    type="text"
                    className="btn btn-secondary"
                    placeholder="Unvan / Rol (Örn: Tasarımcı, Geliştirici)"
                    value={regTitle}
                    onChange={(e) => setRegTitle(e.target.value)}
                  />

                  <input
                    type="submit"
                    value={isLoading ? "Hesap Oluşturuluyor..." : "Kayıt Ol & Başla"}
                    className="btn btn-primary mt-1"
                    disabled={isLoading || isProcessingAvatar}
                  />
                </form>
              </div>

              <p className="footer-note">
                Zaten hesabın var mı?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setErrorMessage(null);
                  }}
                  className="underline hover:opacity-80 font-bold"
                >
                  Giriş Yap
                </button>
              </p>
            </>
          )}
        </div>
      </div>

      {/* --- QR OKUT MODAL --- */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
          <div className="relative w-full max-w-sm rounded-3xl bg-[var(--secondary)] border border-[var(--border)] p-6 text-center space-y-5 shadow-2xl">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-alt-color)] hover:text-[var(--text-color)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 pt-2">
              <h3 className="text-lg font-bold text-[var(--text-color)]">QR ile Hızlı Giriş</h3>
              <p className="text-xs text-[var(--text-alt-color)]">
                Mobil Kirpi uygulamanızdan QR kodunu okutun veya anında onaylayın.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-inner">
              <QrCode className="w-40 h-40 text-black" />
            </div>

            <div className="space-y-2">
              <button
                onClick={handleQuickQrLogin}
                disabled={isLoading}
                className="btn btn-primary text-xs py-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Giriş Yapılıyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Hızlı Girişi Onayla</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="text-xs text-[var(--text-alt-color)] hover:text-[var(--text-color)] block mx-auto pt-1"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
