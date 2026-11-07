import React, { useState } from 'react';
import { X, CheckCircle2, Shield, Sparkles, Mail, Lock, User as UserIcon } from 'lucide-react';
import { User, UserRole } from '../types';

interface SocialLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onLoginSuccess: (user: User) => void;
  defaultRole?: UserRole;
}

export const SocialLoginModal: React.FC<SocialLoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  defaultRole = 'user',
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSocialAuth = (provider: 'google' | 'facebook' | 'twitter') => {
    // Generate simulated social authenticated profile
    const providerNames: Record<string, string> = {
      google: 'Google Account (OAuth)',
      facebook: 'Facebook Connect',
      twitter: 'X / Twitter OAuth',
    };

    const simulatedUser: User = {
      id: `usr-${provider}-${Date.now().toString().slice(-6)}`,
      email: email || currentUser?.email || `${provider}.user@gmail.com`,
      name: name.trim() || (selectedRole === 'creator' ? 'Celebes Creative Organizer' : 'Peserta Aktif Celebes Event'),
      role: selectedRole,
      avatar:
        provider === 'google'
          ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      phone: '0812' + Math.floor(10000000 + Math.random() * 90000000),
      organization: organization || (selectedRole === 'creator' ? 'Celebes Creative Organizer' : 'Umum / Mahasiswa'),
      auth_provider: provider,
      status: selectedRole === 'creator' ? 'pending_approval' : 'active',
      createdAt: new Date().toISOString(),
    };

    if (selectedRole === 'creator') {
      setNotification(`Pendaftaran akun kreator via ${providerNames[provider]} berhasil! Akun Anda berstatus Menunggu Persetujuan Admin Pusat.`);
    } else {
      setNotification(`Berhasil terhubung melalui ${providerNames[provider]} sebagai ${selectedRole.toUpperCase()}!`);
    }
    setTimeout(() => {
      onLoginSuccess(simulatedUser);
      onClose();
    }, 1100);
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const simulatedUser: User = {
      id: `usr-email-${Date.now().toString().slice(-6)}`,
      email,
      name: name.trim() || email.split('@')[0],
      role: selectedRole,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
      phone: '085811223344',
      organization: organization || 'Umum',
      auth_provider: 'local',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setNotification(`Selamat datang! Anda masuk sebagai ${selectedRole.toUpperCase()}.`);
    setTimeout(() => {
      onLoginSuccess(simulatedUser);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              {isRegistering ? 'Daftar Akun Celebes Event' : 'Masuk ke Celebes Event'}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Autentikasi instan melalui Google & Akun Sosial Media
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {notification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2 border-b border-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Role Choice */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Peran Akun:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('user')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedRole === 'user'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Peserta / User</span>
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Mendaftar, beli tiket, unduh e-ticket QR
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('creator')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedRole === 'creator'
                    ? 'border-blue-500 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Kreator Event</span>
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Buat event, form dinamis, kelola pendaftar
                </p>
              </button>
            </div>
          </div>

          {/* Social Auth Buttons (Google & Social) */}
          <div className="space-y-2.5">
            {/* Google Single Click Sign-In */}
            <button
              type="button"
              onClick={() => handleSocialAuth('google')}
              className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-800 font-semibold text-sm shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer hover:shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Lanjut dengan Google</span>
            </button>

            {/* Other Social Options */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSocialAuth('facebook')}
                className="py-2 px-3 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialAuth('twitter')}
                className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>X / Twitter</span>
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="shrink-0 mx-3 text-slate-400 text-xs uppercase font-medium">
              atau via email
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {isRegistering && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  defaultValue="demo123"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {selectedRole === 'creator' && isRegistering && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Komunitas / Organisasi Event
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Contoh: Festiva Promosindo Creative"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-xs"
            >
              {isRegistering ? 'Daftar Sekarang' : 'Masuk Akun'}
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              {isRegistering
                ? 'Sudah punya akun? Masuk di sini'
                : 'Belum punya akun? Buat akun baru'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
