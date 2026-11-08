import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, 
  PlusCircle, 
  Users, 
  QrCode, 
  Share2, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Download, 
  Camera, 
  Search, 
  Sparkles,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  MessageCircle,
  Layers,
  Check,
  Upload,
  XCircle,
  Eye,
  Clock,
  ShieldCheck,
  X,
  Smartphone,
  Video,
  VideoOff,
  SwitchCamera,
  Maximize2,
  Minimize2,
  Volume2
} from 'lucide-react';
import { EventItem, TicketTier, CustomFormField, Order, User, PayoutRequest, PlatformSettings } from '../types';
import { formatRupiah, generateSocialShareLinks, verifyAndCheckInTicket } from '../utils/ticketing-logic';
import { api } from '../services/api';

interface CreatorDashboardProps {
  currentUser: User;
  events: EventItem[];
  orders: Order[];
  payouts: PayoutRequest[];
  onRefreshData: () => void;
  onOpenShareModal: (event: EventItem) => void;
  platformSettings?: PlatformSettings;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  currentUser,
  events,
  orders,
  payouts,
  onRefreshData,
  onOpenShareModal,
  platformSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'create-event' | 'attendees' | 'scanner' | 'manual-payments' | 'share-links' | 'payouts'>('events');

  // Creator's filtered events & orders
  const myEvents = events.filter(e => e.creatorId === currentUser.id || currentUser.role === 'admin');
  const myEventIds = new Set(myEvents.map(e => e.id));
  const myOrders = orders.filter(o => myEventIds.has(o.eventId));

  // Manual payment orders for this creator
  const manualOrders = myOrders.filter(o => o.paymentType === 'manual' || o.paymentMethod === 'bank_transfer_manual');
  const pendingManualOrders = manualOrders.filter(o => o.paymentStatus === 'pending_manual_verification');

  // Manual verification UI states
  const [manualFilter, setManualFilter] = useState<'all' | 'pending' | 'paid' | 'rejected'>('all');
  const [previewProofOrder, setPreviewProofOrder] = useState<Order | null>(null);
  const [rejectionModalOrder, setRejectionModalOrder] = useState<Order | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('Bukti transfer tidak sesuai nominal / dana belum masuk');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Flattened attendees
  const allMyTickets = myOrders.flatMap(o => o.tickets);

  // Stats calculation per Blueprint v3 (Split Fee & Net Revenue)
  const totalGrossRevenue = myOrders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((acc, o) => acc + (o.hargaTiketAsli || o.subtotal), 0);

  const totalCreatorCommission = myOrders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((acc, o) => acc + (o.potonganKreator || Math.round((o.hargaTiketAsli || o.subtotal) * 0.02)), 0);

  const totalNetCreatorEarnings = myOrders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((acc, o) => acc + (o.netPendapatanKreator || ((o.hargaTiketAsli || o.subtotal) - (o.potonganKreator || Math.round((o.hargaTiketAsli || o.subtotal) * 0.02)))), 0);

  const totalTicketsSold = allMyTickets.length;
  const totalCheckedIn = allMyTickets.filter(t => t.checkInStatus === 'checked_in').length;

  // Selected event for attendee list / scanner
  const [selectedEventId, setSelectedEventId] = useState<string>(myEvents[0]?.id || '');
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');

  // Scanner & Mobile Gatekeeper State
  const [scannerInputCode, setScannerInputCode] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; ticket?: any } | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFullScreenGate, setIsFullScreenGate] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // New Event Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Teknologi & Bisnis');
  const [bannerImage, setBannerImage] = useState('https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('2026-12-10T09:00');
  const [endDate, setEndDate] = useState('2026-12-10T17:00');
  const [locationType, setLocationType] = useState<'venue' | 'online' | 'hybrid'>('venue');
  const [venueName, setVenueName] = useState('Ballroom Grand Horizon Hotel');
  const [venueAddress, setVenueAddress] = useState('Jl. Jenderal Sudirman Kav. 25, Jakarta');
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState('');

  // Ticket Tiers in Form
  const [formTickets, setFormTickets] = useState<Partial<TicketTier>[]>([
    { id: 'tier-temp-1', name: 'Regular Entry Pass', price: 100000, quota: 200, maxPerOrder: 5, description: 'Akses seminar & e-sertifikat', isActive: true },
    { id: 'tier-temp-2', name: 'VIP Executive', price: 300000, quota: 50, maxPerOrder: 2, description: 'Akses VIP front row & merchandise', isActive: true },
  ]);

  // Dynamic Custom Form Fields in Form
  const [formCustomFields, setFormCustomFields] = useState<CustomFormField[]>([
    { id: 'cf-temp-1', eventId: '', label: 'Instansi / Komunitas', fieldType: 'text', placeholder: 'Nama instansi Anda', isRequired: true, orderIndex: 1 },
    { id: 'cf-temp-2', eventId: '', label: 'Ukuran Kaos Event', fieldType: 'dropdown', options: ['S', 'M', 'L', 'XL', 'XXL'], isRequired: true, orderIndex: 2 },
  ]);

  // Payout Form
  const [payoutAmount, setPayoutAmount] = useState<number>(5000000);
  const [payoutBank, setPayoutBank] = useState('Bank BCA');
  const [payoutAccountNo, setPayoutAccountNo] = useState('8880192831');
  const [payoutAccountName, setPayoutAccountName] = useState('Festiva Promosindo');
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);

  // Add tier handler
  const handleAddTicketTier = () => {
    setFormTickets([
      ...formTickets,
      {
        id: `tier-temp-${Date.now()}`,
        name: 'Presale Tiket Tambahan',
        price: 75000,
        quota: 100,
        maxPerOrder: 4,
        description: 'Akses acara & kit peserta',
        isActive: true,
      },
    ]);
  };

  const handleRemoveTicketTier = (index: number) => {
    if (formTickets.length <= 1) {
      alert('Event harus memiliki minimal 1 kategori tiket!');
      return;
    }
    setFormTickets(formTickets.filter((_: Partial<TicketTier>, i: number) => i !== index));
  };

  // Add custom form question handler
  const handleAddCustomField = () => {
    setFormCustomFields([
      ...formCustomFields,
      {
        id: `cf-temp-${Date.now()}`,
        eventId: '',
        label: 'Pertanyaan Pendaftaran Baru',
        fieldType: 'text',
        placeholder: 'Masukkan jawaban Anda',
        isRequired: false,
        orderIndex: formCustomFields.length + 1,
      },
    ]);
  };

  const handleRemoveCustomField = (index: number) => {
    setFormCustomFields(formCustomFields.filter((_: CustomFormField, i: number) => i !== index));
  };

  // Handle Event Creation submit
  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role === 'creator' && currentUser.status === 'pending_approval') {
      setActionMessage({
        type: 'error',
        text: 'Akun Anda sedang menunggu persetujuan dari Super Admin Pusat. Anda belum diizinkan membuat event.',
      });
      return;
    }
    if (!title) {
      alert('Judul event wajib diisi!');
      return;
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + `-${Math.floor(100 + Math.random() * 900)}`;

    const eventPayload: Partial<EventItem> = {
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      creatorAvatar: currentUser.avatar,
      title,
      slug,
      category,
      bannerImage,
      shortDescription: shortDescription || 'Event spektakuler diselenggarakan oleh kreator profesional Celebes Event.',
      description: description || 'Ikuti rangkaian agenda dan nikmati pengalaman terbaik bersama pembicara dan peserta lainnya.',
      startDate,
      endDate,
      locationType,
      venueName: locationType !== 'online' ? venueName : undefined,
      venueAddress: locationType !== 'online' ? venueAddress : undefined,
      onlineMeetingUrl: locationType !== 'venue' ? (onlineMeetingUrl || 'https://zoom.us/j/sample') : undefined,
      status: 'published',
      isFeatured: false,
      registrationLimit: formTickets.reduce((acc: number, t: Partial<TicketTier>) => acc + (t.quota || 0), 0),
      socialShareSlug: slug.slice(0, 15),
      tickets: formTickets.map((t: Partial<TicketTier>, idx: number) => ({
        id: `tier-${Date.now()}-${idx}`,
        eventId: '',
        name: t.name || 'Tiket Masuk',
        description: t.description || '',
        price: Number(t.price) || 0,
        quota: Number(t.quota) || 100,
        soldCount: 0,
        maxPerOrder: Number(t.maxPerOrder) || 5,
        isActive: true,
      })),
      customFields: formCustomFields.map((f: CustomFormField, idx: number) => ({
        ...f,
        id: `cf-${Date.now()}-${idx}`,
        orderIndex: idx + 1,
      })),
    };

    try {
      await api.createEvent(eventPayload);
      alert('Selamat! Event dan Formulir Pendaftaran berhasil dibuat dan dipublikasikan.');
      onRefreshData();
      setActiveTab('events');
    } catch (err: any) {
      alert('Gagal membuat event: ' + err.message);
    }
  };

  // Audio Beep Feedback for Gate Staff
  const playScanBeep = (isSuccess: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 320, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + (isSuccess ? 0.22 : 0.45));
    } catch {
      // Audio autoplay might be blocked
    }
  };

  // Smartphone Camera Management
  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      setCameraError('Kamera tidak dapat diakses atau izin ditolak di browser HP Anda. Silakan beri izin kamera atau gunakan input kode tiket manual.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      await startCamera(nextFacing);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Check-in scanner execute
  const handleExecuteCheckIn = async (codeToVerify?: string) => {
    const raw = codeToVerify || scannerInputCode;
    if (!raw.trim()) return;

    // Parse QR payload if full string formatted like CELEBES:VERIFY:CODE:EVENT:EMAIL or legacy TIKETNUSA:VERIFY:CODE
    let code = raw.trim();
    if (code.includes('CELEBES:VERIFY:') || code.includes('TIKETNUSA:VERIFY:')) {
      const parts = code.split(':');
      if (parts.length >= 3) {
        code = parts[2];
      }
    }

    const res = await api.checkInTicket(code, selectedEventId || undefined);
    setScanResult(res);
    playScanBeep(res.success);
    setScannerInputCode('');
    if (res.success) {
      onRefreshData();
    }
  };

  // Export Attendees to CSV
  const handleExportCSV = () => {
    const targetEvent = myEvents.find(e => e.id === selectedEventId) || myEvents[0];
    if (!targetEvent) return;

    const eventOrders = myOrders.filter(o => o.eventId === targetEvent.id);
    const tickets = eventOrders.flatMap(o => o.tickets);

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'No,Kode Tiket,Nama Peserta,Email,Kategori Tiket,Status CheckIn,Waktu CheckIn,Jawaban Formulir\n';

    tickets.forEach((t, i) => {
      const formAnswers = (t.responses || []).map(r => `${r.fieldLabel}: ${r.responseValue}`).join(' | ');
      const row = [
        i + 1,
        `"${t.ticketCode}"`,
        `"${t.attendeeName}"`,
        `"${t.attendeeEmail}"`,
        `"${t.tierName}"`,
        `"${t.checkInStatus}"`,
        `"${t.checkInTime || '-'}"`,
        `"${formAnswers}"`,
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `peserta_${targetEvent.slug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Transparent fee calculation based on Super Admin platform settings
  const feeConfig = platformSettings?.feeConfig || {
    feeType: 'percentage',
    percentageValue: 2,
    fixedValue: 2000,
    description: 'Biaya komisi platform tiket',
  };

  const calculatedFeeDeduction = feeConfig.feeType === 'percentage'
    ? Math.round(payoutAmount * (feeConfig.percentageValue / 100))
    : feeConfig.fixedValue;

  const calculatedNetAmount = Math.max(0, payoutAmount - calculatedFeeDeduction);
  const feeBreakdownDesc = feeConfig.feeType === 'percentage'
    ? `Potongan komisi platform ${feeConfig.percentageValue}% (-${formatRupiah(calculatedFeeDeduction)})`
    : `Potongan biaya platform tetap (-${formatRupiah(calculatedFeeDeduction)})`;

  // Submit Payout
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payoutAmount <= 0) return;

    try {
      await api.createPayout({
        creatorId: currentUser.id,
        creatorName: currentUser.name,
        eventId: myEvents[0]?.id || 'evt-001',
        eventTitle: myEvents[0]?.title || 'Pencairan Penjualan Tiket',
        amount: calculatedNetAmount,
        grossAmount: payoutAmount,
        platformFeeDeduction: calculatedFeeDeduction,
        feeBreakdownText: feeBreakdownDesc,
        netAmount: calculatedNetAmount,
        bankName: payoutBank,
        accountNumber: payoutAccountNo,
        accountName: payoutAccountName,
      });

      setPayoutSuccess(`Permintaan penarikan dana ${formatRupiah(payoutAmount)} berhasil diajukan! Potongan platform: ${formatRupiah(calculatedFeeDeduction)}, Dana bersih diterima: ${formatRupiah(calculatedNetAmount)}.`);
      onRefreshData();
    } catch (err: any) {
      alert('Gagal mengajukan penarikan: ' + err.message);
    }
  };

  // Manual payment verification handlers
  const handleApprovePayment = async (order: Order) => {
    try {
      await api.verifyPaymentOrder(order.id, 'paid', undefined, currentUser.name);
      setActionMessage({ type: 'success', text: `Pembayaran pesanan ${order.orderNumber} berhasil disetujui! E-Ticket telah aktif.` });
      setPreviewProofOrder(null);
      onRefreshData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Gagal menyetujui pembayaran: ' + err.message });
    }
  };

  const handleConfirmRejectPayment = async () => {
    if (!rejectionModalOrder) return;
    try {
      await api.verifyPaymentOrder(
        rejectionModalOrder.id,
        'payment_rejected',
        rejectionReasonText,
        currentUser.name
      );
      setActionMessage({ type: 'success', text: `Pembayaran pesanan ${rejectionModalOrder.orderNumber} telah ditolak dengan catatan.` });
      setRejectionModalOrder(null);
      setPreviewProofOrder(null);
      onRefreshData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Gagal menolak pembayaran: ' + err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* PENDING APPROVAL WARNING BANNER */}
      {currentUser.role === 'creator' && currentUser.status === 'pending_approval' && (
        <div className="bg-amber-50 border-2 border-amber-400 p-5 rounded-3xl shadow-sm text-slate-900 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-amber-950">
                  Akun Kreator Anda Sedang Menunggu Persetujuan Admin Pusat
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                  Status: Pending Approval
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                Pendaftaran akun atas nama <strong>{currentUser.organization || currentUser.name}</strong> ({currentUser.email}) telah kami terima dan saat ini sedang dalam proses verifikasi oleh Tim Super Admin Celebes Event.
              </p>
              <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs text-slate-700 space-y-1">
                <p className="font-bold text-slate-800 text-[11px]">SOP & Alur Persetujuan:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                  <li>Admin pusat akan meninjau kelayakan profil penyelenggara.</li>
                  <li>Setelah diverifikasi dan disetujui, <strong>notifikasi email persetujuan resmi akan otomatis masuk ke {currentUser.email}</strong>.</li>
                  <li>Setelah disetujui, hak akses penerbitan event, form pendaftaran peserta, scan QR scanner, dan pencairan dana akan aktif seketika.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner & Stats Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Kreator Studio & Dashboard
              </span>
              <span className="text-xs text-slate-400 font-mono">Organisasi: {currentUser.organization || 'Festiva Promosindo'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Halo, {currentUser.name}! 👋
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Kelola event, buat formulir pendaftaran dinamis, periksa daftar peserta, scan tiket hari H, dan cairkan pendapatan tiket Anda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentUser.status === 'pending_approval') {
                  setActionMessage({
                    type: 'error',
                    text: 'Fitur pembuatan event dikunci sementara hingga akun Anda disetujui oleh Super Admin Pusat.',
                  });
                  return;
                }
                setActiveTab('create-event');
              }}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                currentUser.status === 'pending_approval'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>
                {currentUser.status === 'pending_approval' ? 'Buat Event (Menunggu Persetujuan)' : 'Buat Event & Form Baru'}
              </span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Omzet Penjualan Tiket (Gross)</span>
            <span className="text-lg sm:text-xl font-extrabold text-white mt-1 block">
              {formatRupiah(totalGrossRevenue)}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
              Dari {myOrders.filter(o => o.paymentStatus === 'paid').length} transaksi lunas
            </span>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Saldo Bersih Kreator (Net)</span>
            <span className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-1 block">
              {formatRupiah(totalNetCreatorEarnings)}
            </span>
            <span className="text-[10px] text-emerald-300 font-semibold mt-1 block">
              Setelah komisi platform 2% ({formatRupiah(totalCreatorCommission)})
            </span>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Tiket Terjual</span>
            <span className="text-lg sm:text-xl font-extrabold text-blue-400 mt-1 block">
              {totalTicketsSold} Tiket
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Di {myEvents.length} event Anda
            </span>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Peserta Hadir (Check-in)</span>
            <span className="text-lg sm:text-xl font-extrabold text-purple-400 mt-1 block">
              {totalCheckedIn} / {totalTicketsSold}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Tervalidasi di scanner gerbang
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2 text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'events'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Event Saya ({myEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('create-event')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'create-event'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Buat Event & Form Dinamis</span>
        </button>

        <button
          onClick={() => setActiveTab('manual-payments')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'manual-payments'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Verifikasi Pembayaran</span>
          {pendingManualOrders.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {pendingManualOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('attendees')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'attendees'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Peserta & Data Form</span>
        </button>

        <button
          onClick={() => setActiveTab('scanner')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'scanner'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Scanner Check-in Tiket</span>
        </button>

        <button
          onClick={() => setActiveTab('share-links')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'share-links'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Link Pendaftaran & Sosmed</span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'payouts'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Penarikan Dana (Payout)</span>
        </button>
      </div>

      {/* TAB CONTENT 1: DAFTAR EVENT SAYA */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">
              Daftar Event Dikelola
            </h2>
            <button
              onClick={() => setActiveTab('create-event')}
              className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Event Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myEvents.map(event => {
              const totalQuota = event.tickets.reduce((acc, t) => acc + t.quota, 0);
              const totalSold = event.tickets.reduce((acc, t) => acc + (t.soldCount || 0), 0);

              return (
                <div key={event.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="relative aspect-16/9 bg-slate-100">
                      <img src={event.bannerImage} alt={event.title} className="w-full h-full object-cover" />
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                        {event.category}
                      </span>
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                        {event.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{event.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2">{event.shortDescription}</p>

                      <div className="pt-2 text-xs text-slate-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Tiket Terjual:</span>
                          <span className="font-bold text-slate-900">{totalSold} / {totalQuota}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(100, Math.round((totalSold / (totalQuota || 1)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setActiveTab('attendees');
                      }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Peserta ({totalSold})
                    </button>

                    <button
                      onClick={() => onOpenShareModal(event)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Salin Link & Bagikan ke Sosmed"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Link</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: BUAT EVENT & FORM DINAMIS */}
      {activeTab === 'create-event' && currentUser.status === 'pending_approval' && (
        <div className="bg-white rounded-3xl border-2 border-amber-300 p-8 shadow-sm text-center max-w-2xl mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1">
            <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-full">
              Status: Menunggu Persetujuan Admin Pusat
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">
              Fitur Pembuatan Event Terkunci Sementara
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Pendaftaran akun Anda atas nama <strong>{currentUser.organization || currentUser.name}</strong> ({currentUser.email}) sedang dalam antrean verifikasi oleh Super Admin Pusat.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-left text-slate-700 space-y-2 max-w-lg mx-auto">
            <p className="font-bold text-slate-900 text-xs">Informasi Proses Verifikasi:</p>
            <div className="flex items-start gap-2 text-[11px] text-slate-600">
              <span className="font-bold text-blue-600 shrink-0">1.</span>
              <span>Super Admin Pusat akan memverifikasi kelayakan profil EO / lembaga Anda di sistem.</span>
            </div>
            <div className="flex items-start gap-2 text-[11px] text-slate-600">
              <span className="font-bold text-blue-600 shrink-0">2.</span>
              <span>Setelah disetujui, <strong>surat pemberitahuan resmi otomatis dikirimkan ke email {currentUser.email}</strong>.</span>
            </div>
            <div className="flex items-start gap-2 text-[11px] text-slate-600">
              <span className="font-bold text-blue-600 shrink-0">3.</span>
              <span>Setelah persetujuan diberikan, formulir pembuatan event ini akan langsung terbuka dan aktif.</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setActiveTab('events')}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Kembali ke Ringkasan Dashboard
            </button>
          </div>
        </div>
      )}

      {activeTab === 'create-event' && currentUser.status !== 'pending_approval' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="border-b border-slate-200 pb-4 mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Buat Event Baru & Kustomisasi Formulir Pendaftaran
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Atur informasi acara, kategori tiket berganda, dan tambahkan formulir dinamis khusus yang wajib diisi peserta.
            </p>
          </div>

          <form onSubmit={handleCreateEventSubmit} className="space-y-6">
            {/* Bagian 1: Data Acara */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                1. Informasi Pokok Event
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Judul Event *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Indonesia Creative Economy Summit 2026"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kategori Acara</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Teknologi & Bisnis">Teknologi & Bisnis</option>
                    <option value="Musik & Hiburan">Musik & Hiburan</option>
                    <option value="Workshop & Edukasi">Workshop & Edukasi</option>
                    <option value="Olahraga & Kesehatan">Olahraga & Kesehatan</option>
                    <option value="Seni & Pameran Budaya">Seni & Pameran Budaya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">URL Gambar Banner</label>
                  <input
                    type="url"
                    value={bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Waktu Mulai Acara</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Waktu Selesai Acara</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipe Lokasi</label>
                  <select
                    value={locationType}
                    onChange={(e) => setLocationType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="venue">Venue Fisik (Gedung / Outdoor)</option>
                    <option value="online">Online Stream (Zoom / Google Meet)</option>
                    <option value="hybrid">Hybrid (Fisik + Online Stream)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nama Tempat / Venue</label>
                  <input
                    type="text"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="Contoh: JICC Senayan / Hall A"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi Singkat (Ringkasan)</label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Satu atau dua kalimat yang menarik calon pendaftar..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi Lengkap & Rundown Acara</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Rincian agenda, pembicara, fasilitas peserta, dan peraturan acara..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 2: Kategori Tiket */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    2. Manajemen Kategori & Harga Tiket
                  </h3>
                  <p className="text-[11px] text-slate-500">Anda dapat membuat berbagai jenis tiket (Regular, VIP, Early Bird, Gratis)</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTicketTier}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Tambah Jenis Tiket</span>
                </button>
              </div>

              <div className="space-y-3">
                {formTickets.map((tier: Partial<TicketTier>, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Tier #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTicketTier(idx)}
                        className="text-xs text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Tier</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">Nama Tiket</label>
                        <input
                          type="text"
                          required
                          value={tier.name || ''}
                          onChange={(e) => {
                            const updated = [...formTickets];
                            updated[idx].name = e.target.value;
                            setFormTickets(updated);
                          }}
                          placeholder="VIP / Regular / Presale"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">Harga (Rp)</label>
                        <input
                          type="number"
                          required
                          value={tier.price ?? 0}
                          onChange={(e) => {
                            const updated = [...formTickets];
                            updated[idx].price = Number(e.target.value);
                            setFormTickets(updated);
                          }}
                          placeholder="0 jika gratis"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">Kuota Tiket</label>
                        <input
                          type="number"
                          required
                          value={tier.quota ?? 100}
                          onChange={(e) => {
                            const updated = [...formTickets];
                            updated[idx].quota = Number(e.target.value);
                            setFormTickets(updated);
                          }}
                          placeholder="Jumlah kuota"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">Maks. Tiket / Order</label>
                        <input
                          type="number"
                          required
                          value={tier.maxPerOrder ?? 5}
                          onChange={(e) => {
                            const updated = [...formTickets];
                            updated[idx].maxPerOrder = Number(e.target.value);
                            setFormTickets(updated);
                          }}
                          placeholder="Maks per order"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bagian 3: Formulir Pendaftaran Dinamis (Form Builder) */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    3. Form Pendaftaran Dinamis (Custom Questions)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tambahkan pertanyaan kustom khusus (Ukuran baju, instansi, pilihan sesi, dietary)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Tambah Pertanyaan Form</span>
                </button>
              </div>

              <div className="space-y-3">
                {formCustomFields.map((field: CustomFormField, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Pertanyaan #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(idx)}
                        className="text-xs text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">Label Pertanyaan</label>
                        <input
                          type="text"
                          required
                          value={field.label}
                          onChange={(e) => {
                            const updated = [...formCustomFields];
                            updated[idx].label = e.target.value;
                            setFormCustomFields(updated);
                          }}
                          placeholder="Contoh: Ukuran Kaos Peserta"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">Tipe Input</label>
                        <select
                          value={field.fieldType}
                          onChange={(e) => {
                            const updated = [...formCustomFields];
                            updated[idx].fieldType = e.target.value as any;
                            if (e.target.value === 'dropdown' && !updated[idx].options) {
                              updated[idx].options = ['Pilihan 1', 'Pilihan 2', 'Pilihan 3'];
                            }
                            setFormCustomFields(updated);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="text">Teks Singkat</option>
                          <option value="dropdown">Pilihan Dropdown (Select)</option>
                          <option value="textarea">Teks Panjang (Paragraf)</option>
                          <option value="number">Nomor / Angka</option>
                        </select>
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={field.isRequired}
                            onChange={(e) => {
                              const updated = [...formCustomFields];
                              updated[idx].isRequired = e.target.checked;
                              setFormCustomFields(updated);
                            }}
                            className="rounded-sm text-blue-600 w-4 h-4"
                          />
                          <span>Wajib Diisi Peserta</span>
                        </label>
                      </div>
                    </div>

                    {field.fieldType === 'dropdown' && (
                      <div className="pt-2">
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Pilihan Dropdown (Pisahkan dengan koma):
                        </label>
                        <input
                          type="text"
                          value={field.options?.join(', ') || ''}
                          onChange={(e) => {
                            const updated = [...formCustomFields];
                            updated[idx].options = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            setFormCustomFields(updated);
                          }}
                          placeholder="S, M, L, XL, XXL"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan & Publikasikan Event</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT 3: DAFTAR PESERTA & JAWABAN FORMULIR */}
      {activeTab === 'attendees' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Daftar Peserta & Manajemen Kehadiran
              </h2>
              <p className="text-xs text-slate-500">
                Lihat data pendaftar dan respon kuesioner pendaftaran
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {myEvents.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={attendeeSearchQuery}
                onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan nama peserta, email, atau kode tiket..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Table of Attendees */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Kode Tiket</th>
                  <th className="p-3">Nama Peserta</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Kategori Tiket</th>
                  <th className="p-3">Jawaban Form Kustom</th>
                  <th className="p-3">Status Check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allMyTickets
                  .filter(t => !selectedEventId || t.eventId === selectedEventId)
                  .filter(t =>
                    !attendeeSearchQuery ||
                    t.attendeeName.toLowerCase().includes(attendeeSearchQuery.toLowerCase()) ||
                    t.attendeeEmail.toLowerCase().includes(attendeeSearchQuery.toLowerCase()) ||
                    t.ticketCode.toLowerCase().includes(attendeeSearchQuery.toLowerCase())
                  )
                  .map(ticket => (
                    <tr key={ticket.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-blue-700">{ticket.ticketCode}</td>
                      <td className="p-3 font-semibold text-slate-900">{ticket.attendeeName}</td>
                      <td className="p-3 text-slate-500">{ticket.attendeeEmail}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px]">
                          {ticket.tierName}
                        </span>
                      </td>
                      <td className="p-3">
                        {ticket.responses && ticket.responses.length > 0 ? (
                          <div className="space-y-0.5 max-w-xs">
                            {ticket.responses.map(r => (
                              <div key={r.id} className="text-[11px] text-slate-600 truncate">
                                <span className="font-semibold text-slate-800">{r.fieldLabel}:</span> {r.responseValue}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ticket.checkInStatus === 'checked_in'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ticket.checkInStatus === 'checked_in' ? 'Checked-In' : 'Belum Hadir'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: SCANNER CHECK-IN TIKET DENGAN KAMERA HP */}
      {activeTab === 'scanner' && (
        <div className={`space-y-6 max-w-3xl mx-auto ${isFullScreenGate ? 'fixed inset-0 z-50 bg-slate-950 p-4 sm:p-6 overflow-y-auto text-white flex flex-col justify-between' : ''}`}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  Mobile Gate Ready
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">Audio Feedback Aktif</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Scanner Check-in Gate Tiket (Kamera Smartphone)
              </h2>
              <p className="text-xs text-slate-500">
                Pindai QR Code tiket peserta secara realtime menggunakan kamera belakang HP atau masukkan kode secara manual di pintu gerbang event.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsFullScreenGate(!isFullScreenGate)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Mode Layar Penuh Petugas Gerbang"
              >
                {isFullScreenGate ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span>{isFullScreenGate ? 'Keluar Fullscreen' : 'Mode Layar Penuh'}</span>
              </button>
            </div>
          </div>

          {/* Kamera Area */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-slate-700 space-y-4">
            {/* Kamera Viewfinder / Simulator */}
            <div className="relative aspect-4/3 sm:aspect-16/9 w-full bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
              {/* Video Element */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              />

              {/* Inactive State Banner */}
              {!isCameraActive && (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Kamera Belum Aktif</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Klik tombol di bawah untuk menyalakan kamera HP (kamera belakang) dan memindai tiket langsung di lokasi gerbang masuk.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 inline-flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Video className="w-4 h-4" />
                    <span>Nyalakan Kamera HP Sekarang</span>
                  </button>
                </div>
              )}

              {/* Overlay Reticle (Active viewfinder) */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-dashed border-emerald-400 rounded-3xl bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    {/* Laser scanline */}
                    <div className="absolute inset-x-2 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-bounce" />
                    {/* Corner accents */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-300 mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    Posisikan QR Code E-Ticket di dalam kotak
                  </span>
                </div>
              )}

              {/* Floating Camera Controls when active */}
              {isCameraActive && (
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2.5 bg-black/60 backdrop-blur-md text-white rounded-xl hover:bg-black/80 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    title="Ganti Kamera Depan/Belakang"
                  >
                    <SwitchCamera className="w-4 h-4 text-emerald-400" />
                    <span>Kamera: {cameraFacing === 'environment' ? 'Belakang (HP)' : 'Depan'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                  >
                    <VideoOff className="w-4 h-4" />
                    <span>Matikan Kamera</span>
                  </button>
                </div>
              )}
            </div>

            {/* Error banner if permission denied */}
            {cameraError && (
              <div className="p-3.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Input Manual Kode Tiket */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300">
                Atau Ketik / Scan Kode Tiket Manual:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scannerInputCode}
                  onChange={(e) => setScannerInputCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleExecuteCheckIn();
                    }
                  }}
                  placeholder="Contoh: TN-TECH-9912-V88A atau paste QR payload"
                  className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleExecuteCheckIn()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                >
                  Validasi Gate
                </button>
              </div>
            </div>
          </div>

          {/* Hasil Pemindaian (Scan Result Banner) */}
          {scanResult && (
            <div
              className={`p-5 rounded-2xl border-2 flex items-start gap-4 transition-all shadow-lg animate-in fade-in zoom-in-95 ${
                scanResult.success
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                  : 'bg-red-50 border-red-400 text-red-950'
              }`}
            >
              {scanResult.success ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <XCircle className="w-7 h-7" />
                </div>
              )}
              <div className="flex-1 text-xs space-y-1">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    scanResult.success ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
                  }`}
                >
                  {scanResult.success ? 'VALID • SILAKAN MASUK' : 'DITOLAK • TIKET TIDAK VALID'}
                </span>
                <h3 className="font-extrabold text-base text-slate-900">{scanResult.message}</h3>

                {scanResult.ticket && (
                  <div className="mt-2 p-3 bg-white/80 rounded-xl border border-slate-200/80 text-xs text-slate-800 space-y-1">
                    <p>
                      <strong>Nama Peserta:</strong> {scanResult.ticket.attendeeName}
                    </p>
                    <p>
                      <strong>Kategori Tiket:</strong> {scanResult.ticket.tierName}
                    </p>
                    <p>
                      <strong>Kode Tiket:</strong> <span className="font-mono font-bold text-blue-700">{scanResult.ticket.ticketCode}</span>
                    </p>
                    {scanResult.ticket.checkInTime && (
                      <p className="text-[10px] text-slate-500">
                        Waktu Check-in: {new Date(scanResult.ticket.checkInTime).toLocaleTimeString('id-ID')} WIB
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Click Samples for Testing */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
            <span className="text-xs font-bold text-slate-700 block">
              Simulasi Cepat Gatekeeper (Klik untuk uji coba scan langsung):
            </span>
            <div className="flex flex-wrap gap-2">
              {allMyTickets.slice(0, 5).map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => handleExecuteCheckIn(ticket.ticketCode)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    ticket.checkInStatus === 'checked_in'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  <span>{ticket.ticketCode}</span>
                  <span className="text-[10px] font-normal">({ticket.checkInStatus === 'checked_in' ? 'Sudah Masuk' : 'Belum'})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: LINK PENDAFTARAN & SOSIAL MEDIA */}
      {activeTab === 'share-links' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600" />
              Pusat Link Pendaftaran & Promosi Media Sosial Kreator
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              "untuk krator buatkan link pendaftaran menggunakan google dan akun sosial media" — Salin dan bagikan link resmi pendaftaran event Anda ke berbagai kanal komunikasi.
            </p>
          </div>

          <div className="space-y-6">
            {myEvents.map(event => {
              const links = generateSocialShareLinks(
                { title: event.title, slug: event.slug, shortDescription: event.shortDescription },
                window.location.origin
              );

              return (
                <div key={event.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{event.title}</h3>
                      <span className="text-xs text-slate-500 font-mono">Slug: /event/{event.slug}</span>
                    </div>
                    <button
                      onClick={() => onOpenShareModal(event)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Buka Modal Share</span>
                    </button>
                  </div>

                  {/* Social Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <a
                      href={links.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>

                    <a
                      href={links.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold border border-sky-200 flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4 text-sky-600" />
                      <span>Telegram</span>
                    </a>

                    <a
                      href={links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300 flex items-center justify-center gap-2"
                    >
                      <span className="font-extrabold text-xs">𝕏</span>
                      <span>Twitter / X</span>
                    </a>

                    <a
                      href={links.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl text-xs font-bold border border-blue-200 flex items-center justify-center gap-2"
                    >
                      <span className="font-bold text-xs">f</span>
                      <span>Facebook</span>
                    </a>
                  </div>

                  {/* Google Registration Link */}
                  <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs space-y-1">
                    <span className="font-bold text-blue-900 block flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Link Pendaftaran Cepat via Akun Google:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={links.googleRegisterUrl}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-[11px] truncate select-all"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(links.googleRegisterUrl);
                          alert('Link registrasi Google berhasil disalin!');
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1 shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Link</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: PENARIKAN DANA (PAYOUT) */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Penarikan Dana Hasil Penjualan Tiket (Payout)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Cairkan saldo penjualan tiket langsung ke rekening bank atau dompet digital Anda
            </p>
          </div>

          {payoutSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{payoutSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Form Penarikan */}
            <div className="md:col-span-6 space-y-4">
              <form onSubmit={handleRequestPayout} className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Formulir Pengajuan Payout
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nominal Penarikan (Rp)</label>
                  <input
                    type="number"
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Saldo bersih siap ditarik: <strong className="text-emerald-700">{formatRupiah(totalNetCreatorEarnings)}</strong> (Omzet Kotor Asli: {formatRupiah(totalGrossRevenue)} - Komisi Platform 2%: {formatRupiah(totalCreatorCommission)})
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Bank Tujuan / E-Wallet</label>
                  <select
                    value={payoutBank}
                    onChange={(e) => setPayoutBank(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Bank BCA">Bank BCA</option>
                    <option value="Bank Mandiri">Bank Mandiri</option>
                    <option value="Bank BRI">Bank BRI</option>
                    <option value="Bank BNI">Bank BNI</option>
                    <option value="Dana E-Wallet">Dana (E-Wallet)</option>
                    <option value="GoPay">GoPay (E-Wallet)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nomor Rekening / HP</label>
                  <input
                    type="text"
                    required
                    value={payoutAccountNo}
                    onChange={(e) => setPayoutAccountNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nama Pemilik Rekening</label>
                  <input
                    type="text"
                    required
                    value={payoutAccountName}
                    onChange={(e) => setPayoutAccountName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                {/* Live Transparent Platform Fee Calculation Card */}
                <div className="bg-white p-3.5 rounded-xl border border-blue-200 text-xs space-y-2 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      Rincian Transparansi Potongan Platform
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                      {feeConfig.feeType === 'percentage' ? `Komisi ${feeConfig.percentageValue}%` : `Tetap ${formatRupiah(feeConfig.fixedValue)}`}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Jumlah Penarikan Kotor:</span>
                      <span className="font-semibold text-slate-900">{formatRupiah(payoutAmount)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 font-medium">
                      <span>Potongan Biaya Platform:</span>
                      <span>-{formatRupiah(calculatedFeeDeduction)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-extrabold text-xs pt-1.5 border-t border-slate-100">
                      <span>Dana Bersih Masuk Rekening:</span>
                      <span>{formatRupiah(calculatedNetAmount)}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic">
                    *Potongan platform diatur resmi oleh Super Admin ({feeConfig.description || 'Komisi pemeliharaan platform'}).
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ajukan Penarikan {formatRupiah(calculatedNetAmount)}</span>
                </button>
              </form>
            </div>

            {/* Riwayat Payouts Transparan */}
            <div className="md:col-span-6 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>Riwayat Pengajuan Penarikan</span>
                <span className="text-[10px] text-slate-400 font-normal">Transparansi Finansial</span>
              </h3>

              <div className="space-y-2.5">
                {payouts.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    Belum ada riwayat pengajuan penarikan dana.
                  </div>
                ) : (
                  payouts.map(p => {
                    const netVal = p.netAmount ?? p.amount;
                    const grossVal = p.grossAmount ?? p.amount;
                    const feeVal = p.platformFeeDeduction ?? (grossVal - netVal);

                    return (
                      <div key={p.id} className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs space-y-2 shadow-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-slate-400 font-medium block">Dana Bersih Diterima</span>
                            <span className="font-extrabold text-emerald-700 text-base">
                              {formatRupiah(netVal)}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Rincian Transparan */}
                        <div className="p-2 bg-slate-50 rounded-lg text-[11px] space-y-1 text-slate-600 border border-slate-100">
                          <div className="flex justify-between">
                            <span>Omzet Kotor Penarikan:</span>
                            <span className="font-semibold text-slate-800">{formatRupiah(grossVal)}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Potongan Platform:</span>
                            <span>-{formatRupiah(feeVal)}</span>
                          </div>
                          {p.feeBreakdownText && (
                            <div className="text-[10px] text-slate-400 italic">
                              {p.feeBreakdownText}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                          <span>{p.bankName} • {p.accountNumber} ({p.accountName})</span>
                          <span>Diajukan: {new Date(p.createdAt).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: VERIFIKASI PEMBAYARAN MANUAL */}
      {activeTab === 'manual-payments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  Manual Verification Gateway
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">{pendingManualOrders.length} Menunggu Tindakan</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Pusat Verifikasi Pembayaran Transfer Manual
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Periksa bukti struk mutasi bank pendaftar. Setujui untuk menerbitkan E-Ticket resmi atau tolak dengan alasan.
              </p>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto self-start sm:self-auto">
              <button
                onClick={() => setManualFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  manualFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({manualOrders.length})
              </button>
              <button
                onClick={() => setManualFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  manualFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span>Menunggu Verifikasi</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-800 text-white">
                  {pendingManualOrders.length}
                </span>
              </button>
              <button
                onClick={() => setManualFilter('paid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  manualFilter === 'paid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Disetujui ({manualOrders.filter(o => o.paymentStatus === 'paid').length})
              </button>
              <button
                onClick={() => setManualFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  manualFilter === 'rejected'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ditolak ({manualOrders.filter(o => o.paymentStatus === 'payment_rejected').length})
              </button>
            </div>
          </div>

          {/* List of Manual Verification Orders */}
          {manualOrders.filter(o => {
            if (manualFilter === 'pending') return o.paymentStatus === 'pending_manual_verification';
            if (manualFilter === 'paid') return o.paymentStatus === 'paid';
            if (manualFilter === 'rejected') return o.paymentStatus === 'payment_rejected';
            return true;
          }).length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Tidak Ada Pembayaran Menunggu</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Semua pengajuan transfer manual sudah diproses atau belum ada pendaftar yang menggunakan metode ini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {manualOrders
                .filter(o => {
                  if (manualFilter === 'pending') return o.paymentStatus === 'pending_manual_verification';
                  if (manualFilter === 'paid') return o.paymentStatus === 'paid';
                  if (manualFilter === 'rejected') return o.paymentStatus === 'payment_rejected';
                  return true;
                })
                .map((order) => {
                  const isPending = order.paymentStatus === 'pending_manual_verification';
                  const isApproved = order.paymentStatus === 'paid';
                  const isRejected = order.paymentStatus === 'payment_rejected';

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                    >
                      {/* Left: Order Info & Attendee */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                            {order.orderNumber}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">
                            {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : isApproved
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {isPending ? 'MENUNGGU VERIFIKASI' : isApproved ? 'LUNAS & DISETUJUI' : 'DITOLAK'}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">{order.eventTitle}</h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                            <span>Pemesan: <strong className="text-slate-900">{order.buyerName}</strong></span>
                            <span>Email: <strong className="text-slate-800">{order.buyerEmail}</strong></span>
                            <span>WhatsApp: <strong className="text-slate-800">{order.buyerPhone}</strong></span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Bank Pengirim:</span>
                            <span className="font-bold text-slate-800">{order.senderBank || 'Bank Transfer'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Nama Pemilik Rekening:</span>
                            <span className="font-bold text-slate-800">{order.senderAccountName || order.buyerName}</span>
                          </div>
                          {order.transferNotes && (
                            <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200">
                              <span className="text-slate-500">Catatan Pengirim:</span>
                              <span className="italic text-slate-700">{order.transferNotes}</span>
                            </div>
                          )}
                          {isRejected && order.rejectionReason && (
                            <div className="pt-1 border-t border-red-200 text-red-700 text-[11px]">
                              <strong>Alasan Penolakan:</strong> {order.rejectionReason}
                            </div>
                          )}
                          {isApproved && order.verifiedBy && (
                            <div className="pt-1 border-t border-emerald-200 text-emerald-700 text-[11px]">
                              <strong>Diverifikasi oleh:</strong> {order.verifiedBy}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Transfer Proof Thumbnail & Approval Actions */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4 shrink-0">
                        {/* Amount */}
                        <div className="text-left sm:text-right lg:text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Transfer</span>
                          <span className="text-base sm:text-lg font-black text-blue-700">
                            {formatRupiah(order.totalAmount)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{order.tickets.length} Tiket</span>
                        </div>

                        {/* Proof image trigger */}
                        {order.paymentProofUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewProofOrder(order)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
                            title="Klik untuk memperbesar bukti transfer"
                          >
                            <img
                              src={order.paymentProofUrl}
                              alt="Bukti Transfer"
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                            />
                            <div className="text-left pr-2">
                              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                <span>Lihat Struk</span>
                              </span>
                              <span className="text-[10px] text-slate-400 block">Klik untuk zoom</span>
                            </div>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Tidak ada foto struk</span>
                        )}

                        {/* Action buttons */}
                        {isPending && (
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRejectionModalOrder(order);
                                setRejectionReasonText('Nominal transfer tidak sesuai atau mutasi bank belum terdata');
                              }}
                              className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Tolak</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApprovePayment(order)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Setujui (Approve)</span>
                            </button>
                          </div>
                        )}

                        {isApproved && (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-1.5 border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>E-Ticket Aktif</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: BUKTI TRANSFER FULL IMAGE PREVIEW */}
      {previewProofOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                  Verifikasi Struk Transfer Manual
                </span>
                <h4 className="font-bold text-sm text-white">
                  Order {previewProofOrder.orderNumber} • {formatRupiah(previewProofOrder.totalAmount)}
                </h4>
              </div>
              <button
                onClick={() => setPreviewProofOrder(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-center">
              <div className="bg-slate-100 rounded-2xl p-2 max-h-[50vh] overflow-hidden flex items-center justify-center border border-slate-200">
                <img
                  src={previewProofOrder.paymentProofUrl}
                  alt="Bukti Transfer Penuh"
                  className="max-h-[48vh] w-auto object-contain rounded-xl shadow-xs"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl text-left text-xs space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pendaftar:</span>
                  <span className="font-bold text-slate-800">{previewProofOrder.buyerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank & Pemilik Rekening:</span>
                  <span className="font-bold text-slate-800">
                    {previewProofOrder.senderBank} ({previewProofOrder.senderAccountName})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jumlah Tagihan:</span>
                  <span className="font-bold text-blue-700">{formatRupiah(previewProofOrder.totalAmount)}</span>
                </div>
                {previewProofOrder.transferNotes && (
                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Catatan:</span>
                    <span className="italic">{previewProofOrder.transferNotes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setPreviewProofOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl"
              >
                Tutup
              </button>

              {previewProofOrder.paymentStatus === 'pending_manual_verification' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectionModalOrder(previewProofOrder);
                      setPreviewProofOrder(null);
                    }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200"
                  >
                    Tolak Pembayaran
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprovePayment(previewProofOrder)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Setujui & Terbitkan Tiket
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ALASAN PENOLAKAN PEMBAYARAN */}
      {rejectionModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-base text-slate-900">Konfirmasi Penolakan Transfer</h3>
            </div>

            <p className="text-xs text-slate-600">
              Masukkan alasan mengapa pembayaran pesanan <strong>{rejectionModalOrder.orderNumber}</strong> ditolak. Pendaftar akan melihat catatan ini di halaman tiket mereka.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alasan Penolakan *</label>
              <textarea
                rows={3}
                required
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                placeholder="Contoh: Nominal transfer tidak sesuai tagihan / struk transfer buram tidak terbaca."
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectionModalOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectPayment}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Tolak Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
