import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Calendar, 
  ArrowRight,
  KeyRound,
  LogIn,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  Instagram,
  Globe,
  AlertCircle,
  HelpCircle,
  Award,
  Crown
} from 'lucide-react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../data/seedData';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  defaultRole?: UserRole;
  initialMode?: 'login' | 'register_creator' | 'register_user';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  defaultRole = 'creator',
  initialMode = 'login',
}) => {
  const [modalMode, setModalMode] = useState<'login' | 'register_creator' | 'register_user'>(initialMode);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState<'creator' | 'user'>('user');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);

  // Creator Registration State
  const [creatorForm, setCreatorForm] = useState({
    name: '',
    organization: '',
    email: '',
    phone: '',
    password: '',
    category: 'Konser Musik & Festival',
    city: 'Makassar',
    bankName: 'BCA',
    bankAccountNumber: '',
    bankAccountName: '',
    instagram: '',
    portfolioUrl: '',
    agreeTerms: true,
  });
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [isLoadingCreator, setIsLoadingCreator] = useState(false);

  // Participant Registration State
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [userError, setUserError] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Google Creator Registration State
  const [isGoogleCreatorModalOpen, setIsGoogleCreatorModalOpen] = useState(false);
  const [googleCreatorForm, setGoogleCreatorForm] = useState({
    name: 'Andi Pratama',
    email: 'kreator.celebes@gmail.com',
    organization: 'Celebes Music & Art Production',
    phone: '081241199887',
    city: 'Makassar / Sulawesi',
    category: 'Konser Musik & Festival',
  });
  const [googleCreatorError, setGoogleCreatorError] = useState<string | null>(null);

  // General Notification
  const [notification, setNotification] = useState<string | null>(null);

  // Sync initialMode when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalMode(initialMode);
      setNotification(null);
      setLoginError(null);
      setCreatorError(null);
      setUserError(null);
      setIsGoogleCreatorModalOpen(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Autofill helper for demo creator and participant testing accounts
  const handleFillCredentials = (role: 'creator' | 'user') => {
    if (role === 'creator') {
      setLoginEmail('kreator@celebescreative.id');
      setLoginPassword('kreator123');
    } else {
      setLoginEmail('budi.santoso@gmail.com');
      setLoginPassword('demo123');
    }
    setLoginError(null);
  };

  // Standard Form Login (Strict Password Validation)
  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setLoginError('Alamat email wajib diisi!');
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError('Password wajib diisi! Masukkan password akun Anda.');
      return;
    }

    setIsLoadingLogin(true);
    setLoginError(null);

    try {
      const res = await api.login(loginEmail.trim(), loginPassword.trim());
      
      // Super Admin is separated: only allowed via dedicated footer login
      if (res.user.role === 'admin') {
        setLoginError('Portal ini khusus untuk Peserta dan Kreator Event. Akses Super Administrator Pusat telah dipindahkan ke tombol logo tersembunyi di footer bawah website.');
        setIsLoadingLogin(false);
        return;
      }

      if (res.user.role === 'creator' && res.user.status === 'pending_approval') {
        setNotification(`Selamat datang, ${res.user.name}! Akun Anda sedang dalam proses verifikasi & menunggu persetujuan Super Admin.`);
      } else {
        setNotification(`Selamat datang kembali, ${res.user.name}!`);
      }
      setTimeout(() => {
        onLoginSuccess(res.user);
        onClose();
      }, 700);
    } catch (err: any) {
      setLoginError(err.message || 'Login gagal. Periksa kembali email dan password Anda.');
    } finally {
      setIsLoadingLogin(false);
    }
  };

  // Google Creator Registration
  const handleGoogleRegisterCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleCreatorError(null);

    if (!googleCreatorForm.email.trim() || !googleCreatorForm.email.includes('@')) {
      setGoogleCreatorError('Alamat email Google valid wajib diisi!');
      return;
    }
    if (!googleCreatorForm.organization.trim()) {
      setGoogleCreatorError('Nama organisasi / event organizer wajib diisi!');
      return;
    }
    if (!googleCreatorForm.name.trim()) {
      setGoogleCreatorError('Nama penanggung jawab wajib diisi!');
      return;
    }

    setIsLoadingCreator(true);

    try {
      const payload: Partial<User> = {
        name: googleCreatorForm.name.trim(),
        organization: googleCreatorForm.organization.trim(),
        email: googleCreatorForm.email.trim().toLowerCase(),
        phone: googleCreatorForm.phone.trim() || '081299887766',
        password: 'google_oauth_user123',
        role: 'creator',
        category: googleCreatorForm.category,
        city: googleCreatorForm.city,
        auth_provider: 'google',
        status: 'pending_approval', // Wajib persetujuan Admin Pusat
      };

      const res = await api.registerCreator(payload);
      setNotification(`🎉 Pendaftaran kreator "${googleCreatorForm.organization}" dengan Google berhasil! Akun Anda sedang menunggu persetujuan Admin Pusat. Email konfirmasi akan dikirim ke ${payload.email} setelah disetujui.`);
      setIsGoogleCreatorModalOpen(false);
      setTimeout(() => {
        onLoginSuccess(res.user);
        onClose();
      }, 1200);
    } catch (err: any) {
      setGoogleCreatorError(err.message || 'Pendaftaran kreator dengan Google gagal. Coba lagi.');
    } finally {
      setIsLoadingCreator(false);
    }
  };

  // Creator Onboarding Registration (Formulir Manual)
  const handleRegisterCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatorError(null);

    if (!creatorForm.name.trim()) {
      setCreatorError('Nama lengkap penanggung jawab (PIC) wajib diisi!');
      return;
    }
    if (!creatorForm.organization.trim()) {
      setCreatorError('Nama organisasi / event organizer wajib diisi!');
      return;
    }
    if (!creatorForm.email.trim() || !creatorForm.email.includes('@')) {
      setCreatorError('Alamat email valid wajib diisi untuk akun penyelenggara!');
      return;
    }
    if (!creatorForm.phone.trim()) {
      setCreatorError('Nomor WhatsApp aktif wajib diisi untuk koordinasi & notifikasi tiket!');
      return;
    }
    if (!creatorForm.password || creatorForm.password.length < 6) {
      setCreatorError('Password minimal 6 karakter demi keamanan akun!');
      return;
    }
    if (!creatorForm.agreeTerms) {
      setCreatorError('Anda harus menyetujui Syarat & Ketentuan Kemitraan Kreator Event.');
      return;
    }

    setIsLoadingCreator(true);

    try {
      const payload: Partial<User> = {
        name: creatorForm.name.trim(),
        organization: creatorForm.organization.trim(),
        email: creatorForm.email.trim().toLowerCase(),
        phone: creatorForm.phone.trim(),
        password: creatorForm.password,
        role: 'creator',
        category: creatorForm.category,
        city: creatorForm.city,
        bankName: creatorForm.bankName,
        bankAccountNumber: creatorForm.bankAccountNumber.trim(),
        bankAccountName: creatorForm.bankAccountName.trim() || creatorForm.name.trim(),
        instagram: creatorForm.instagram.trim(),
        portfolioUrl: creatorForm.portfolioUrl.trim(),
        auth_provider: 'local',
        status: 'pending_approval', // Wajib persetujuan Admin Pusat
      };

      const res = await api.registerCreator(payload);
      setNotification(`🎉 Pendaftaran organisasi "${creatorForm.organization}" berhasil! Akun Anda kini berstatus Menunggu Persetujuan (Pending Approval) Admin Pusat. Notifikasi email resmi akan dikirim saat akun Anda disetujui.`);
      setTimeout(() => {
        onLoginSuccess(res.user);
        onClose();
      }, 1200);
    } catch (err: any) {
      setCreatorError(err.message || 'Pendaftaran kreator gagal. Silakan coba lagi.');
    } finally {
      setIsLoadingCreator(false);
    }
  };

  // Participant Registration
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);

    if (!userForm.name.trim()) {
      setUserError('Nama lengkap wajib diisi!');
      return;
    }
    if (!userForm.email.trim() || !userForm.email.includes('@')) {
      setUserError('Alamat email valid wajib diisi!');
      return;
    }
    if (!userForm.password || userForm.password.length < 6) {
      setUserError('Password minimal 6 karakter!');
      return;
    }

    setIsLoadingUser(true);

    try {
      const payload: Partial<User> = {
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        phone: userForm.phone.trim(),
        password: userForm.password,
        role: 'user',
        status: 'active',
      };

      const res = await api.registerUser(payload);
      setNotification(`✅ Pendaftaran berhasil! Selamat datang, ${res.user.name}.`);
      setTimeout(() => {
        onLoginSuccess(res.user);
        onClose();
      }, 700);
    } catch (err: any) {
      setUserError(err.message || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setIsLoadingUser(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
              Celebes Event & Ticketing Portal
            </span>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {modalMode === 'login' && <LogIn className="w-5 h-5 text-blue-400" />}
              {modalMode === 'register_creator' && <Calendar className="w-5 h-5 text-cyan-400" />}
              {modalMode === 'register_user' && <UserIcon className="w-5 h-5 text-emerald-400" />}
              <span>
                {modalMode === 'login' && 'Masuk ke Akun Anda'}
                {modalMode === 'register_creator' && 'Daftar Calon Kreator & Penyelenggara'}
                {modalMode === 'register_user' && 'Daftar Akun Peserta / Pembeli'}
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Notification Banner */}
        {notification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2 border-b border-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="p-4 sm:p-6 pb-2">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setModalMode('login');
                setLoginError(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                modalMode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-blue-600" />
              <span>Masuk</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalMode('register_creator');
                setCreatorError(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                modalMode === 'register_creator'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daftar Kreator</span>
              <span className="hidden sm:inline text-[9px] bg-amber-400 text-slate-950 px-1 py-0.2 rounded font-extrabold uppercase">
                Mitra EO
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalMode('register_user');
                setUserError(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                modalMode === 'register_user'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Daftar Peserta</span>
            </button>
          </div>
        </div>

        {/* MODAL CONTENT CONTAINER */}
        <div className="p-4 sm:p-6 pt-2 max-h-[72vh] overflow-y-auto space-y-5">

          {/* ======================================================== */}
          {/* TAB 1: MASUK / LOGIN */}
          {/* ======================================================== */}
          {modalMode === 'login' && (
            <div className="space-y-4">

              {loginError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Standard Form Login */}
              <form onSubmit={handleFormLogin} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Masukkan alamat email akun Anda"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password Akun <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Wajib Verifikasi</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan password akun Anda"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingLogin}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoadingLogin ? 'Sedang Memeriksa Password...' : 'Masuk ke Akun'}</span>
                </button>
              </form>

              {/* Quick Testing Short-cuts with Credentials */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px] font-semibold">Pilih akun demo (dengan password):</span>
                  <button
                    type="button"
                    onClick={() => setModalMode('register_creator')}
                    className="font-bold text-blue-600 hover:underline cursor-pointer text-[11px]"
                  >
                    Daftar Kreator Baru
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFillCredentials('creator')}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-left transition-colors cursor-pointer border border-blue-200"
                  >
                    <span className="block text-[11px] font-bold">Kreator Event (EO)</span>
                    <span className="block text-[10px] text-blue-600 font-mono">kreator@celebescreative.id</span>
                    <span className="block text-[9px] text-slate-500 mt-0.5">Password: kreator123</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFillCredentials('user')}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-left transition-colors cursor-pointer border border-emerald-200"
                  >
                    <span className="block text-[11px] font-bold">Peserta / User</span>
                    <span className="block text-[10px] text-emerald-600 font-mono">budi.santoso@gmail.com</span>
                    <span className="block text-[9px] text-slate-500 mt-0.5">Password: demo123</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: DAFTAR CALON KREATOR (CREATOR ONBOARDING) */}
          {/* ======================================================== */}
          {modalMode === 'register_creator' && (
            <div className="space-y-4">
              {/* Persyaratan Persetujuan Admin Pusat Banner */}
              <div className="bg-amber-50 border-2 border-amber-300 p-3.5 rounded-2xl text-slate-900 space-y-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <h4 className="text-xs font-bold text-amber-950">
                    Wajib Mendapat Persetujuan Admin Pusat
                  </h4>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Seluruh pendaftaran kreator (baik via <strong>Google</strong> maupun Formulir) wajib disetujui Super Admin sebelum dapat membuat event. Notifikasi email resmi akan otomatis dikirimkan ke email Anda saat akun disetujui.
                </p>
              </div>

              {/* OPSI 1: DAFTAR DENGAN AKUN GOOGLE (User Request) */}
              <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white rounded-2xl border border-blue-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Daftar Kreator dengan Akun Google</h4>
                      <p className="text-[11px] text-slate-500">Otentikasi cepat menggunakan akun Google Anda</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    Rekomendasi
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGoogleCreatorModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>Daftar / Lanjut dengan Akun Google</span>
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="shrink-0 mx-3 text-slate-400 text-[11px] uppercase font-semibold">
                  atau isi formulir pendaftaran manual
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleRegisterCreator} className="space-y-4">
                {creatorError && (
                  <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{creatorError}</span>
                  </div>
                )}

              {/* SECTION A: INFORMASI PENANGGUNG JAWAB & ORGANISASI */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. Profil Lembaga / Event Organizer</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama Organisasi / Event Organizer <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={creatorForm.organization}
                      onChange={(e) => setCreatorForm({ ...creatorForm, organization: e.target.value })}
                      placeholder="Contoh: Celebes Creative Promosindo"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama PIC / Penanggung Jawab <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={creatorForm.name}
                      onChange={(e) => setCreatorForm({ ...creatorForm, name: e.target.value })}
                      placeholder="Contoh: Rahmat Hidayat"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Email Resmi Penyelenggara (Untuk Login) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={creatorForm.email}
                        onChange={(e) => setCreatorForm({ ...creatorForm, email: e.target.value })}
                        placeholder="eo@organisasi.id"
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        required
                        value={creatorForm.phone}
                        onChange={(e) => setCreatorForm({ ...creatorForm, phone: e.target.value })}
                        placeholder="08123456789"
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Password Akun <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={creatorForm.password}
                        onChange={(e) => setCreatorForm({ ...creatorForm, password: e.target.value })}
                        placeholder="Minimal 6 karakter"
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kota / Wilayah Basis
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={creatorForm.city}
                        onChange={(e) => setCreatorForm({ ...creatorForm, city: e.target.value })}
                        placeholder="Contoh: Makassar / Gowa / Manado"
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Kategori Event Utama yang Biasa Digelar
                  </label>
                  <select
                    value={creatorForm.category}
                    onChange={(e) => setCreatorForm({ ...creatorForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="Konser Musik & Festival">Konser Musik & Festival</option>
                    <option value="Seminar & Workshop">Seminar, Workshop & Konferensi</option>
                    <option value="Olahraga & Marathon">Olahraga, Fun Run & Marathon</option>
                    <option value="Festival Budaya & Kuliner">Festival Budaya, Kuliner & Expo</option>
                    <option value="Pameran & Bazar Komunitas">Pameran Seni, Bazar & Komunitas</option>
                    <option value="Keagamaan & Tabligh">Keagamaan & Pengajian Akbar</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* SECTION B: REKENING PENCAIRAN TIKET */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Rekening Bank untuk Pencairan Penjualan Tiket</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Digunakan untuk mentransfer hasil penjualan tiket event Anda setelah verifikasi panitia.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama Bank
                    </label>
                    <select
                      value={creatorForm.bankName}
                      onChange={(e) => setCreatorForm({ ...creatorForm, bankName: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BCA">BCA</option>
                      <option value="Bank Mandiri">Bank Mandiri</option>
                      <option value="BNI">BNI</option>
                      <option value="BRI">BRI</option>
                      <option value="BSI">BSI (Bank Syariah)</option>
                      <option value="Bank Sulselbar">Bank Sulselbar</option>
                      <option value="CIMB Niaga">CIMB Niaga</option>
                      <option value="Permata">Bank Permata</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nomor Rekening
                    </label>
                    <input
                      type="text"
                      value={creatorForm.bankAccountNumber}
                      onChange={(e) => setCreatorForm({ ...creatorForm, bankAccountNumber: e.target.value })}
                      placeholder="Nomor rekening"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Atas Nama Rekening
                    </label>
                    <input
                      type="text"
                      value={creatorForm.bankAccountName}
                      onChange={(e) => setCreatorForm({ ...creatorForm, bankAccountName: e.target.value })}
                      placeholder="Nama di buku tabungan"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION C: MEDIA SOSIAL & PORTOFOLIO */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                  <span>3. Akun Media Sosial & Tautan Portofolio (Opsional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Instagram Organisasi
                    </label>
                    <div className="relative">
                      <Instagram className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={creatorForm.instagram}
                        onChange={(e) => setCreatorForm({ ...creatorForm, instagram: e.target.value })}
                        placeholder="@namaorganisasi"
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Website / Portofolio Event
                    </label>
                    <div className="relative">
                      <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="url"
                        value={creatorForm.portfolioUrl}
                        onChange={(e) => setCreatorForm({ ...creatorForm, portfolioUrl: e.target.value })}
                        placeholder="https://organisasi.com"
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* TERMS CHECKBOX */}
              <div className="pt-2">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={creatorForm.agreeTerms}
                    onChange={(e) => setCreatorForm({ ...creatorForm, agreeTerms: e.target.checked })}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Saya menyatakan data organisasi di atas adalah benar dan menyetujui Ketentuan Kerjasama Penyelenggara Event di Celebes Event & Bergulir Media.
                  </span>
                </label>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isLoadingCreator}
                className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>
                  {isLoadingCreator ? 'Mendaftarkan Organisasi...' : 'Selesaikan Pendaftaran & Masuk ke Kreator Studio'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

          {/* ======================================================== */}
          {/* TAB 3: DAFTAR PESERTA / PEMBELI TIKET */}
          {/* ======================================================== */}
          {modalMode === 'register_user' && (
            <form onSubmit={handleRegisterUser} className="space-y-4">
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      Pendaftaran Akun Peserta & Pembeli Tiket
                    </h4>
                    <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                      Daftar akun gratis untuk menyimpan e-ticket, cetak kartu akses QR, dan riwayat transaksi event Anda.
                    </p>
                  </div>
                </div>
              </div>

              {userError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{userError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="budi@gmail.com"
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      placeholder="08123456789"
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoadingUser}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <UserIcon className="w-4 h-4" />
                <span>{isLoadingUser ? 'Membuat Akun...' : 'Daftar sebagai Peserta'}</span>
              </button>
            </form>
          )}

        </div>

        {/* GOOGLE CREATOR REGISTRATION MODAL POPUP */}
        {isGoogleCreatorModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Header with Google Brand */}
              <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white p-2 flex items-center justify-center shadow-md shrink-0">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
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
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Daftar Akun Kreator dengan Google</h3>
                    <p className="text-[11px] text-blue-200">Google OAuth & Pendaftaran Penyelenggara</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGoogleCreatorModalOpen(false)}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notice */}
              <div className="bg-amber-50 p-3 border-b border-amber-200 text-slate-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-tight text-amber-900">
                  <strong>Persetujuan Pusat:</strong> Setelah mendaftar dengan akun Google, status akun akan <strong>Menunggu Persetujuan Admin Pusat</strong>. Surat konfirmasi akan masuk ke email Google Anda setelah disetujui.
                </p>
              </div>

              {googleCreatorError && (
                <div className="m-4 mb-0 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{googleCreatorError}</span>
                </div>
              )}

              <form onSubmit={handleGoogleRegisterCreator} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Email Akun Google Anda <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={googleCreatorForm.email}
                      onChange={(e) => setGoogleCreatorForm({ ...googleCreatorForm, email: e.target.value })}
                      placeholder="kreator@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Penanggung Jawab (PIC) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={googleCreatorForm.name}
                    onChange={(e) => setGoogleCreatorForm({ ...googleCreatorForm, name: e.target.value })}
                    placeholder="Contoh: Andi Pratama"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Organisasi / Event Organizer (EO) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={googleCreatorForm.organization}
                    onChange={(e) => setGoogleCreatorForm({ ...googleCreatorForm, organization: e.target.value })}
                    placeholder="Contoh: Celebes Music Festival EO"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nomor WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={googleCreatorForm.phone}
                      onChange={(e) => setGoogleCreatorForm({ ...googleCreatorForm, phone: e.target.value })}
                      placeholder="081241199887"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kota Operasional
                    </label>
                    <input
                      type="text"
                      value={googleCreatorForm.city}
                      onChange={(e) => setGoogleCreatorForm({ ...googleCreatorForm, city: e.target.value })}
                      placeholder="Makassar"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGoogleCreatorModalOpen(false)}
                    className="w-1/3 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isLoadingCreator}
                    className="w-2/3 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span>{isLoadingCreator ? 'Mendaftarkan...' : 'Kirim Pendaftaran Google'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
