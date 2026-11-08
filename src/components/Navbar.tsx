import React, { useState } from 'react';
import { 
  Ticket, 
  Calendar, 
  ShieldCheck, 
  PlusCircle, 
  LogIn, 
  LogOut, 
  Sparkles,
  ChevronDown,
  User as UserIcon,
  Layers,
  HelpCircle,
  Newspaper
} from 'lucide-react';
import { User, UserRole, PlatformSettings } from '../types';

interface NavbarProps {
  currentUser: User | null;
  onOpenLoginModal: (mode?: 'login' | 'register_creator' | 'register_user') => void;
  onLogout: () => void;
  onOpenCreateEvent: () => void;
  activeTab: 'browse' | 'my-tickets' | 'news' | 'creator-studio' | 'admin-portal';
  setActiveTab: (tab: 'browse' | 'my-tickets' | 'news' | 'creator-studio' | 'admin-portal') => void;
  settings?: PlatformSettings;
  onOpenHelpCenter?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenLoginModal,
  onLogout,
  onOpenCreateEvent,
  activeTab,
  setActiveTab,
  settings,
  onOpenHelpCenter,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  const platformName = settings?.platformName || 'Celebes Event';
  const tagline = settings?.tagline || 'Platform Manajemen Event & E-Ticket Resmi';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo - Dynamic from Super Admin Settings */}
        <div 
          onClick={() => setActiveTab('browse')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          {settings?.logoUrl && !logoLoadError ? (
            <img
              src={settings.logoUrl}
              alt={platformName}
              onError={() => setLogoLoadError(true)}
              className="h-10 max-w-[140px] object-contain rounded-xl group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Ticket className="w-5 h-5 -rotate-12" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                {platformName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block leading-none mt-0.5">
              {tagline}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Jelajah Event</span>
          </button>

          <button
            onClick={() => setActiveTab('my-tickets')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'my-tickets'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Ticket className="w-4 h-4 text-emerald-600" />
            <span>Tiket Saya</span>
          </button>

          <button
            onClick={() => setActiveTab('news')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'news'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Newspaper className="w-4 h-4 text-purple-600" />
            <span>Kabar & Berita Event</span>
          </button>

          {currentUser && (currentUser.role === 'creator' || currentUser.role === 'admin') && (
            <button
              onClick={() => setActiveTab('creator-studio')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'creator-studio'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Kreator Studio</span>
            </button>
          )}

          {currentUser && currentUser.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin-portal')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'admin-portal'
                  ? 'bg-purple-50 text-purple-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Super Admin</span>
            </button>
          )}

          <button
            onClick={onOpenHelpCenter}
            className="px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-cyan-600" />
            <span>Pusat Bantuan</span>
          </button>
        </nav>

        {/* Right Action Menu: Login & Profile */}
        <div className="flex items-center gap-3">
          {/* Creator Action */}
          {currentUser && (currentUser.role === 'creator' || currentUser.role === 'admin') ? (
            <button
              onClick={onOpenCreateEvent}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer hover:shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Buat Event Baru</span>
              <span className="sm:hidden">Buat Event</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenLoginModal('register_creator')}
              className="hidden sm:flex px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Daftar Jadi Kreator</span>
            </button>
          )}

          {/* Unified Login / Account Menu */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-2xl hover:bg-slate-100 border border-slate-200/80 transition-all cursor-pointer"
              >
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=128&q=80'}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/20"
                />
                <div className="text-left hidden sm:block">
                  <span className="text-xs font-bold text-slate-900 block truncate max-w-[120px] leading-tight">
                    {currentUser.name}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    currentUser.role === 'admin'
                      ? 'text-purple-600'
                      : currentUser.role === 'creator'
                      ? 'text-blue-600'
                      : 'text-emerald-600'
                  }`}>
                    {currentUser.role === 'admin' ? 'Super Admin' : currentUser.role === 'creator' ? 'Kreator' : 'Peserta'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                      Hak Akses: {currentUser.role.toUpperCase()}
                    </span>
                  </div>

                  <div className="py-1">
                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => {
                          setActiveTab('admin-portal');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-purple-700 font-semibold hover:bg-purple-50 flex items-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        <span>Portal Super Admin</span>
                      </button>
                    )}

                    {(currentUser.role === 'creator' || currentUser.role === 'admin') && (
                      <button
                        onClick={() => {
                          setActiveTab('creator-studio');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-blue-700 font-semibold hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span>Kreator Studio</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setActiveTab('my-tickets');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 font-semibold hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Ticket className="w-4 h-4 text-emerald-600" />
                      <span>Tiket Saya</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenLoginModal();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 font-semibold hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4 text-slate-500" />
                      <span>Ganti Akun / Login Peran Lain</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-red-600 font-semibold hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onOpenLoginModal('login')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk / Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Submenu */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 bg-white/90 px-2 py-2 text-xs">
        <button
          onClick={() => setActiveTab('browse')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md ${
            activeTab === 'browse' ? 'text-blue-600 font-bold' : 'text-slate-600'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Jelajah</span>
        </button>

        <button
          onClick={() => setActiveTab('my-tickets')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md ${
            activeTab === 'my-tickets' ? 'text-blue-600 font-bold' : 'text-slate-600'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Tiket</span>
        </button>

        <button
          onClick={() => setActiveTab('news')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md ${
            activeTab === 'news' ? 'text-blue-600 font-bold' : 'text-slate-600'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span>Berita</span>
        </button>

        {currentUser && (currentUser.role === 'creator' || currentUser.role === 'admin') && (
          <button
            onClick={() => setActiveTab('creator-studio')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md ${
              activeTab === 'creator-studio' ? 'text-blue-600 font-bold' : 'text-slate-600'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Kreator</span>
          </button>
        )}

        {currentUser && currentUser.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin-portal')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-md ${
              activeTab === 'admin-portal' ? 'text-purple-600 font-bold' : 'text-slate-600'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin</span>
          </button>
        )}

        <button
          onClick={onOpenHelpCenter}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-slate-600 hover:text-cyan-600"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Bantuan</span>
        </button>

        {!currentUser && (
          <button
            onClick={() => onOpenLoginModal('login')}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-md text-blue-600 font-bold"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk</span>
          </button>
        )}
      </div>
    </header>
  );
};
