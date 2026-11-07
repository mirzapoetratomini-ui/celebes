import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  Calendar, 
  MapPin, 
  Ticket, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Shield, 
  Headphones, 
  CreditCard,
  Building2,
  Mail,
  Phone,
  Clock,
  Instagram,
  Linkedin,
  Youtube,
  Twitter,
  LogIn,
  HelpCircle,
  MessageCircle,
  ArrowUpRight,
  Zap,
  Award,
  Smartphone,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Layers,
  FileText
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { EventCard } from './components/EventCard';
import { EventDetailModal } from './components/EventDetailModal';
import { CheckoutModal } from './components/CheckoutModal';
import { TicketInvoiceModal } from './components/TicketInvoiceModal';
import { SocialShareModal } from './components/SocialShareModal';
import { AuthModal } from './components/AuthModal';
import { CreatorDashboard } from './components/CreatorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { UserTicketsView } from './components/UserTicketsView';
import { HelpCenterModal } from './components/HelpCenterModal';

import { EventItem, Order, PayoutRequest, TicketTier, User, UserRole, PlatformSettings } from './types';
import { INITIAL_USERS, INITIAL_EVENTS, INITIAL_ORDERS, INITIAL_PAYOUTS, DEFAULT_PLATFORM_SETTINGS, INITIAL_FAQS } from './data/seedData';
import { api } from './services/api';

export default function App() {
  // Pengunjung publik default (selalu null / mode tamu saat pertama kali membuka website)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('celebes_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.email) return parsed;
      }
    } catch {}
    return null;
  });
  const [activeTab, setActiveTab] = useState<'browse' | 'my-tickets' | 'creator-studio' | 'admin-portal'>('browse');

  // Platform Settings & Branding (Super Admin Managed)
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);

  // Core Data
  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [payouts, setPayouts] = useState<PayoutRequest[]>(INITIAL_PAYOUTS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  // Filters & Discovery
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [locationFilter, setLocationFilter] = useState<'all' | 'venue' | 'online'>('all');

  // Modals
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<EventItem | null>(null);
  const [checkoutEvent, setCheckoutEvent] = useState<EventItem | null>(null);
  const [checkoutSelectedTickets, setCheckoutSelectedTickets] = useState<{ tier: TicketTier; quantity: number }[]>([]);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [activeInvoiceTicket, setActiveInvoiceTicket] = useState<any>(null);
  const [shareEvent, setShareEvent] = useState<EventItem | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register_creator' | 'register_user'>('login');
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-01');

  const handleOpenAuthModal = (mode: 'login' | 'register_creator' | 'register_user' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Load server data with fallback
  const refreshAllData = async () => {
    try {
      const [fetchedEvents, fetchedOrders, fetchedPayouts, fetchedUsers, fetchedSettings] = await Promise.all([
        api.getEvents(),
        api.getOrders(),
        api.getPayouts(),
        api.getUsers(),
        api.getSettings(),
      ]);
      setEvents(fetchedEvents);
      setOrders(fetchedOrders);
      setPayouts(fetchedPayouts);
      setUsers(fetchedUsers);
      if (fetchedSettings) setPlatformSettings(fetchedSettings);
    } catch {
      // Keep initial fallback
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem('celebes_auth_user');
      sessionStorage.removeItem('celebes_auth_user');
    } catch {}
    setCurrentUser(null);
    setActiveTab('browse');
  };

  const handleUpdatePlatformSettings = (newSettings: PlatformSettings) => {
    setPlatformSettings(newSettings);
  };

  // Categories list matching GoEvent.id standard
  const categories = [
    'Semua',
    'Konser Musik',
    'Seminar & Workshop',
    'Festival Budaya & Kuliner',
    'Olahraga & Fun Run',
    'Pameran & Expo',
    'Webinar Online'
  ];

  // Filtered Events
  const filteredEvents = events.filter(e => {
    const matchesCategory = selectedCategory === 'Semua' || e.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesLocation = locationFilter === 'all' || e.locationType === locationFilter;
    const matchesSearch = !searchQuery || (
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.venueName && e.venueName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const matchesStatus = e.status === 'published';
    return matchesCategory && matchesLocation && matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Promo Announcement Banner */}
      {platformSettings.announcementText && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white text-xs font-semibold py-2 px-4 text-center shadow-xs flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>{platformSettings.announcementText}</span>
        </div>
      )}

      {/* Top Navbar - Clean, Professional Header */}
      <Navbar
        currentUser={currentUser}
        onOpenLoginModal={handleOpenAuthModal}
        onLogout={handleLogout}
        onOpenCreateEvent={() => {
          if (!currentUser) {
            handleOpenAuthModal('register_creator');
            return;
          }
          setActiveTab('creator-studio');
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={platformSettings}
        onOpenHelpCenter={() => setIsHelpCenterOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW 1: BROWSE / EVENT DISCOVERY (GoEvent.id Inspired) */}
        {activeTab === 'browse' && (
          <div className="space-y-12">
            {/* Hero Section - Inspired by GoEvent.id */}
            <div 
              className="relative rounded-3xl overflow-hidden text-white p-8 sm:p-14 shadow-2xl border border-slate-800 bg-cover bg-center min-h-[360px] sm:min-h-[440px] flex flex-col justify-center"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(2, 6, 23, 0.92) 0%, rgba(15, 23, 42, 0.85) 50%, rgba(30, 27, 75, 0.70) 100%), url(${platformSettings.heroBannerImage})`,
              }}
            >
              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>{platformSettings.platformName} • Platform Event & E-Ticket Resmi Indonesia</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight drop-shadow-md">
                  {platformSettings.heroHeadline || 'Jelajahi Pengalaman Terbaik, Rayakan Setiap Momen!'}
                </h1>

                <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl drop-shadow-xs">
                  {platformSettings.heroSubheadline || 'Beli tiket konser musik, festival kuliner, expo bisnis & workshop favoritmu dengan QR Code instan, aman dan bebas repot.'}
                </p>

                {/* Hero Search Box */}
                <div className="pt-2 max-w-2xl">
                  <div className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 flex-1 w-full text-slate-800">
                      <Search className="w-5 h-5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari konser musik, expo teknologi, seminar bisnis..."
                        className="w-full text-xs sm:text-sm bg-transparent focus:outline-hidden"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto px-2">
                      <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value as any)}
                        className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-semibold text-slate-700 w-full sm:w-auto"
                      >
                        <option value="all">Semua Tipe</option>
                        <option value="venue">Offline (Venue)</option>
                        <option value="online">Online Webinar</option>
                      </select>
                      <button
                        onClick={() => {}}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer shrink-0"
                      >
                        Cari Event
                      </button>
                    </div>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="pt-4 flex flex-wrap items-center gap-5 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Jaminan Tiket 100% Asli
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    QRIS & Transfer Bank Otomatis/Manual
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Headphones className="w-4 h-4 text-emerald-400" />
                    Bantuan CS Resmi 24/7
                  </span>
                </div>
              </div>
            </div>

            {/* Category Navigation Bar (Pills inspired by GoEvent.id) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
                <span className="text-slate-400 font-bold px-1 hidden lg:inline">Kategori:</span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0 text-xs">
                <span className="text-slate-500 font-medium">Lokasi:</span>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-700"
                >
                  <option value="all">Semua Format</option>
                  <option value="venue">Tatap Muka (Venue)</option>
                  <option value="online">Live Streaming Online</option>
                </select>
              </div>
            </div>

            {/* SECTION 1: Event Cards Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {selectedCategory === 'Semua' ? 'Event Populer & Pilihan Terbaik' : `Kategori: ${selectedCategory}`}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Pilihan event terverifikasi dengan pengalaman terbaik untuk Anda
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {filteredEvents.length} Event Tersedia
                </span>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-700">Tidak ada event yang sesuai filter Anda.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('Semua');
                      setLocationFilter('all');
                    }}
                    className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Reset Semua Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onSelectEvent={(evt) => setSelectedEventForDetail(evt)}
                      onQuickShare={(evt) => setShareEvent(evt)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: Langkah Mudah Dapatkan Tiket (GoEvent Inspired) */}
            <div className="space-y-6">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                  Panduan Pemesanan
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Langkah Mudah Dapatkan Tiket
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Ikuti langkah sederhana berikut untuk mulai menikmati event favoritmu.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {(platformSettings.howToSteps || DEFAULT_PLATFORM_SETTINGS.howToSteps).map((step) => (
                  <div
                    key={step.stepNumber}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                      {step.stepNumber}
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-slate-900 text-base">{step.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                    </div>
                    {step.badge && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full w-fit">
                        {step.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: Paket Layanan / Price List Paket (GoEvent Inspired) */}
            <div className="space-y-6">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                  Paket Layanan
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Price List Paket
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Pilihan skema kemitraan terbaik untuk promotor & penyelenggara event di seluruh Indonesia
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(platformSettings.servicePackages || DEFAULT_PLATFORM_SETTINGS.servicePackages).map((pkg, idx) => {
                  const isPopular = !!pkg.badge;
                  return (
                    <div
                      key={idx}
                      className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
                        isPopular
                          ? 'bg-slate-900 text-white shadow-2xl border-2 border-blue-500 ring-4 ring-blue-500/10'
                          : 'bg-white text-slate-900 border border-slate-200 shadow-xs hover:shadow-md'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 uppercase tracking-wider shadow-md">
                          {pkg.badge}
                        </div>
                      )}

                      <div className="space-y-5">
                        <div>
                          <span className={`text-[11px] font-bold tracking-wider uppercase block ${isPopular ? 'text-blue-400' : 'text-slate-400'}`}>
                            {pkg.tag}
                          </span>
                          <h4 className="text-xl font-black mt-1">{pkg.name}</h4>
                          <p className={`text-xs mt-1.5 leading-relaxed ${isPopular ? 'text-slate-300' : 'text-slate-500'}`}>
                            {pkg.description}
                          </p>
                        </div>

                        <div className="pt-2 pb-3 border-y border-dashed border-slate-200 dark:border-slate-800">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl sm:text-4xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                              {pkg.price}
                            </span>
                            <span className={`text-xs font-semibold ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>
                              {pkg.priceSub}
                            </span>
                          </div>
                          {pkg.note && (
                            <p className={`text-[11px] mt-2 italic leading-relaxed ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>
                              {pkg.note}
                            </p>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <span className={`text-[11px] font-extrabold uppercase tracking-wider block mb-2 ${isPopular ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              TERMASUK
                            </span>
                            <ul className="space-y-2 text-xs">
                              {pkg.featuresIncluded.map((feat, fIdx) => (
                                <li key={fIdx} className="flex items-start gap-2">
                                  <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPopular ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                  <span className={isPopular ? 'text-slate-200' : 'text-slate-700'}>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {pkg.organizerPrepared && pkg.organizerPrepared.length > 0 && (
                            <div>
                              <span className={`text-[11px] font-extrabold uppercase tracking-wider block mb-2 ${isPopular ? 'text-amber-400' : 'text-amber-700'}`}>
                                DISIAPKAN PENYELENGGARA
                              </span>
                              <ul className="space-y-2 text-xs">
                                {pkg.organizerPrepared.map((prep, pIdx) => (
                                  <li key={pIdx} className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                                    <span className={isPopular ? 'text-slate-300' : 'text-slate-600'}>{prep}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (!currentUser) setIsAuthModalOpen(true);
                          else setActiveTab('creator-studio');
                        }}
                        className={`w-full mt-6 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                          isPopular
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                        }`}
                      >
                        Pilih {pkg.name}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 4: Tentang Kami (About Us) */}
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8">
              <div className="max-w-3xl space-y-3">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                  {platformSettings.aboutUs?.title || 'Tentang Kami'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {platformSettings.aboutUs?.subtitle || 'Platform Manajemen Event & Tiket Digital Terpercaya #1 di Indonesia'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {platformSettings.aboutUs?.story || platformSettings.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" />
                    Visi Kami
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {platformSettings.aboutUs?.vision}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-600" />
                    Misi Kami
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {platformSettings.aboutUs?.mission}
                  </p>
                </div>
              </div>

              {platformSettings.aboutUs?.metrics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                  {platformSettings.aboutUs.metrics.map((m, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                      <span className="text-2xl sm:text-3xl font-black text-blue-600 block">{m.value}</span>
                      <span className="text-xs font-semibold text-slate-600 mt-1 block">{m.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 5: Galeri Dokumentasi Kegiatan Event */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    Dokumentasi Kegiatan
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                    Galeri Event & Momen Spesial
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Kilas balik keseruan festival, konser, dan seminar yang telah sukses diselenggarakan bersama {platformSettings.platformName}.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {(platformSettings.gallery || DEFAULT_PLATFORM_SETTINGS.gallery).map((img, i) => (
                  <div key={img.id || i} className="group relative rounded-2xl overflow-hidden aspect-4/3 bg-slate-100 shadow-xs">
                    <img src={img.imageUrl} alt={img.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end text-white">
                      <span className="text-[10px] font-bold text-amber-300 line-clamp-1">{img.category}</span>
                      <p className="text-[11px] font-semibold leading-tight line-clamp-1">{img.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 6: Keunggulan Layanan Tiket (Trust & Guarantees) */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white border border-slate-800 shadow-xl space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Keunggulan Layanan
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Kenapa Membeli Tiket di {platformSettings.platformName}?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Pengalaman ticketing modern yang aman, terstandarisasi, dan mudah digunakan oleh seluruh masyarakat Indonesia.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3 backdrop-blur-xs">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white text-sm">Garansi Tiket 100% Asli</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Setiap e-tiket dilengkapi tanda tangan QR Code kriptografis unik yang mencegah pemalsuan dan calo tiket.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3 backdrop-blur-xs">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white text-sm">Otomatis & Manual Ready</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Mendukung QRIS instan, Virtual Account semua bank nasional, serta transfer bank manual dengan bukti struk.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3 backdrop-blur-xs">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white text-sm">Gate Scanner Kamera HP</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Check-in hari H tanpa repot. Cukup scan QR tiket menggunakan kamera HP petugas di gerbang masuk secara realtime.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3 backdrop-blur-xs">
                  <div className="w-12 h-12 rounded-xl bg-amber-600/30 text-amber-400 flex items-center justify-center font-bold">
                    <Award className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-white text-sm">Pencairan Dana Transparan</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Potongan komisi {platformSettings.feeConfig?.feeType === 'percentage' ? `${platformSettings.feeConfig.percentageValue}%` : `Rp${platformSettings.feeConfig?.fixedValue.toLocaleString('id-ID')}`} dihitung transparan dan pencairan diproses cepat.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 7: FAQ (Pertanyaan yang Sering Diajukan - GoEvent Inspired) */}
            <div className="space-y-6">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  FAQ
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Pertanyaan yang Sering Diajukan
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Masih ada yang membingungkan? Kami rangkum jawaban dari pertanyaan yang paling sering ditanyakan seputar {platformSettings.platformName}.
                </p>
              </div>

              <div className="max-w-3xl mx-auto space-y-3">
                {INITIAL_FAQS.map((faq) => {
                  const isOpen = openFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-all"
                    >
                      <button
                        onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                        className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 hover:text-blue-600 cursor-pointer"
                      >
                        <span>{faq.question}</span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-4 sm:px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 8: Creator Call To Action (GoEvent Style) */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl text-center md:text-left">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs">
                  Untuk Promotor & Penyelenggara Event
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Ingin Mengadakan Event & Jual Tiket?
                </h3>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  Buat halaman event Anda, sesuaikan formulir registrasi peserta, dan mulai penjualan tiket online dalam 5 menit.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <button
                  onClick={() => {
                    if (!currentUser) setIsAuthModalOpen(true);
                    else setActiveTab('creator-studio');
                  }}
                  className="px-6 py-3 bg-white text-blue-900 font-extrabold rounded-2xl shadow-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-blue-600" />
                  <span>Mulai Jadi Kreator</span>
                </button>
                <button
                  onClick={() => setIsHelpCenterOpen(true)}
                  className="px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl transition-all border border-white/30 text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Konsultasi Penyelenggaraan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: TIKET SAYA */}
        {activeTab === 'my-tickets' && (
          currentUser ? (
            <UserTicketsView
              currentUser={currentUser}
              orders={orders}
              onOpenTicketInvoice={(order, ticket) => {
                setActiveInvoiceOrder(order);
                setActiveInvoiceTicket(ticket || null);
              }}
              onExploreEvents={() => setActiveTab('browse')}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 max-w-md mx-auto shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Ticket className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Silakan Masuk Terlebih Dahulu</h2>
              <p className="text-xs text-slate-500">
                Masuk ke akun Anda untuk melihat daftar tiket event yang telah Anda beli.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Masuk / Login Sekarang
              </button>
            </div>
          )
        )}

        {/* VIEW 3: KREATOR STUDIO */}
        {activeTab === 'creator-studio' && (
          currentUser && (currentUser.role === 'creator' || currentUser.role === 'admin') ? (
            <CreatorDashboard
              currentUser={currentUser}
              events={events}
              orders={orders}
              payouts={payouts}
              onRefreshData={refreshAllData}
              onOpenShareModal={(evt) => setShareEvent(evt)}
              platformSettings={platformSettings}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                <Calendar className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Portal Kreator & Penyelenggara Event</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kelola penjualan tiket, buat formulir pendaftaran dinamis, pantau pencairan dana, dan scan QR tiket menggunakan HP panitia.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  onClick={() => handleOpenAuthModal('register_creator')}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all"
                >
                  Daftar Calon Kreator Baru
                </button>
                <button
                  onClick={() => handleOpenAuthModal('login')}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Sudah Punya Akun? Masuk
                </button>
              </div>
            </div>
          )
        )}

        {/* VIEW 4: ADMIN PORTAL */}
        {activeTab === 'admin-portal' && (
          currentUser && currentUser.role === 'admin' ? (
            <AdminDashboard
              currentUser={currentUser}
              events={events}
              orders={orders}
              payouts={payouts}
              users={users}
              onRefreshData={refreshAllData}
              platformSettings={platformSettings}
              onUpdatePlatformSettings={handleUpdatePlatformSettings}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 max-w-md mx-auto shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Akses Khusus Super Admin</h2>
              <p className="text-xs text-slate-500">
                Halaman ini hanya dapat diakses oleh akun Super Administrator platform.
              </p>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Masuk sebagai Super Admin
              </button>
            </div>
          )
        )}
      </main>

      {/* Corporate Professional Footer (Dynamic Settings Powered) */}
      <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          {/* Main 4-Column Footer */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
            {/* Brand & About Column (Spans 2 cols on lg) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                {platformSettings.logoUrl ? (
                  <img
                    src={platformSettings.logoUrl}
                    alt={platformSettings.platformName}
                    className="h-10 max-w-[140px] object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                    <Ticket className="w-5 h-5 -rotate-12" />
                  </div>
                )}
                <div>
                  <span className="font-extrabold text-2xl tracking-tight text-white">
                    {platformSettings.platformName}
                  </span>
                  <p className="text-[11px] text-slate-400 font-medium">{platformSettings.tagline}</p>
                </div>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                {platformSettings.description}
              </p>

              <div className="pt-2 space-y-2 text-slate-400 text-xs">
                {platformSettings.contactEmail && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                    <a href={`mailto:${platformSettings.contactEmail}`} className="hover:text-white transition-colors">
                      {platformSettings.contactEmail}
                    </a>
                  </div>
                )}
                {platformSettings.contactPhone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                    <a
                      href={`https://wa.me/${platformSettings.contactPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      WhatsApp: {platformSettings.contactPhone}
                    </a>
                  </div>
                )}
                {platformSettings.contactAddress && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{platformSettings.contactAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Kategori Event */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">
                Kategori Event
              </h4>
              <ul className="space-y-2 text-xs">
                {categories.slice(1, 6).map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => {
                        setSelectedCategory(cat);
                        setActiveTab('browse');
                      }}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Untuk Penyelenggara Event */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">
                Penyelenggara
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => {
                      if (!currentUser) setIsAuthModalOpen(true);
                      else setActiveTab('creator-studio');
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Buat & Publikasikan Event
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      if (!currentUser) setIsAuthModalOpen(true);
                      else setActiveTab('creator-studio');
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Form Pendaftaran Dinamis
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      if (!currentUser) setIsAuthModalOpen(true);
                      else setActiveTab('creator-studio');
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Gate Check-in Scanner HP
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      if (!currentUser) setIsAuthModalOpen(true);
                      else setActiveTab('creator-studio');
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Penarikan Dana (Payout)
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Pusat Bantuan & Layanan Kendala */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">
                Pusat Bantuan
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => setIsHelpCenterOpen(true)}
                    className="hover:text-white text-emerald-400 font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Layanan Pengaduan Kendala</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => setIsHelpCenterOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                    Tanya Jawab (FAQ)
                  </button>
                </li>
                <li>
                  <button onClick={() => setIsHelpCenterOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                    Panduan Pembayaran QRIS & Transfer
                  </button>
                </li>
                <li>
                  <button onClick={() => setIsHelpCenterOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                    Syarat & Ketentuan Tiket
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Payment Methods Accepted Strip */}
          <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-2 text-center md:text-left">
                Metode Pembayaran Resmi Terintegrasi:
              </span>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold text-[10px]">
                  QRIS (Bank Indonesia)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold text-[10px]">
                  BCA Virtual Account
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold text-[10px]">
                  Mandiri
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold text-[10px]">
                  BRI
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold text-[10px]">
                  BNI
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold text-[10px]">
                  GoPay & ShopeePay
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold text-[10px]">
                  Transfer Bank Manual
                </span>
              </div>
            </div>

            {/* Social Icons (Dynamic from Super Admin) */}
            <div className="flex items-center gap-3">
              {platformSettings.socialLinks?.instagram && (
                <a
                  href={platformSettings.socialLinks.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {platformSettings.socialLinks?.whatsapp && (
                <a
                  href={platformSettings.socialLinks.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
              {platformSettings.socialLinks?.youtube && (
                <a
                  href={platformSettings.socialLinks.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
              {platformSettings.socialLinks?.twitter && (
                <a
                  href={platformSettings.socialLinks.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {platformSettings.socialLinks?.linkedin && (
                <a
                  href={platformSettings.socialLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Bottom Copyright Bar */}
          <div className="mt-8 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <span>© 2026 {platformSettings.platformName}. Seluruh hak cipta dilindungi undang-undang.</span>
            <div className="flex items-center gap-4">
              <span>Keamanan Transaksi 256-Bit SSL Terenkripsi</span>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-slate-500 hover:text-slate-300 transition-colors text-[11px] cursor-pointer"
              >
                Portal Akses Pengelola
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ALL MODALS */}

      {/* 1. Event Detail Modal */}
      <EventDetailModal
        isOpen={Boolean(selectedEventForDetail)}
        onClose={() => setSelectedEventForDetail(null)}
        event={selectedEventForDetail}
        onOpenShareModal={(evt) => setShareEvent(evt)}
        onProceedToCheckout={(event, selectedTickets) => {
          setSelectedEventForDetail(null);
          setCheckoutEvent(event);
          setCheckoutSelectedTickets(selectedTickets);
        }}
      />

      {/* 2. Checkout Modal */}
      <CheckoutModal
        isOpen={Boolean(checkoutEvent)}
        onClose={() => setCheckoutEvent(null)}
        event={checkoutEvent}
        selectedTickets={checkoutSelectedTickets}
        currentUser={currentUser || INITIAL_USERS[2]}
        onOrderCompleted={(order) => {
          setCheckoutEvent(null);
          refreshAllData();
          setActiveInvoiceOrder(order);
          setActiveInvoiceTicket(null);
        }}
      />

      {/* 3. Ticket Invoice & Printable/Downloadable PDF E-Ticket Pass Modal */}
      <TicketInvoiceModal
        isOpen={Boolean(activeInvoiceOrder)}
        onClose={() => {
          setActiveInvoiceOrder(null);
          setActiveInvoiceTicket(null);
        }}
        order={activeInvoiceOrder}
        selectedTicket={activeInvoiceTicket}
      />

      {/* 4. Social & Google Share Links Modal */}
      <SocialShareModal
        isOpen={Boolean(shareEvent)}
        onClose={() => setShareEvent(null)}
        event={shareEvent}
      />

      {/* 5. Unified Login & Registration Modal (Creator Onboarding, Super Admin, User) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        initialMode={authModalMode}
        onLoginSuccess={(user) => {
          try {
            localStorage.setItem('celebes_auth_user', JSON.stringify(user));
          } catch {}
          setCurrentUser(user);
          refreshAllData();
          if (user.role === 'admin') setActiveTab('admin-portal');
          else if (user.role === 'creator') setActiveTab('creator-studio');
          else setActiveTab('my-tickets');
        }}
      />

      {/* 6. Pusat Bantuan & Layanan Penyampaian Kendala Modal */}
      <HelpCenterModal
        isOpen={isHelpCenterOpen}
        onClose={() => setIsHelpCenterOpen(false)}
        settings={platformSettings}
      />
    </div>
  );
}
