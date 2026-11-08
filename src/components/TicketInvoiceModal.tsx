import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Ticket as TicketIcon, 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  Clock, 
  Building, 
  Award, 
  Layers, 
  Check, 
  Lock, 
  AlertTriangle, 
  RefreshCw, 
  CreditCard,
  XCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Order, Ticket, TicketTemplateType } from '../types';
import { formatRupiah } from '../utils/ticketing-logic';
import { api } from '../services/api';

interface TicketInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  selectedTicket?: Ticket | null;
  onOrderUpdated?: (updatedOrder: Order) => void;
}

export const TicketInvoiceModal: React.FC<TicketInvoiceModalProps> = ({
  isOpen,
  onClose,
  order,
  selectedTicket,
  onOrderUpdated,
}) => {
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TicketTemplateType>('modern');
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});
  const [isCopied, setIsCopied] = useState(false);
  const [liveOrder, setLiveOrder] = useState<Order | null>(order);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [checkStatusFeedback, setCheckStatusFeedback] = useState<string | null>(null);

  useEffect(() => {
    setLiveOrder(order);
    setCheckStatusFeedback(null);
  }, [order]);

  useEffect(() => {
    if (liveOrder && liveOrder.tickets && liveOrder.tickets.length > 0) {
      liveOrder.tickets.forEach(ticket => {
        QRCode.toDataURL(ticket.qrPayload, {
          width: 260,
          margin: 1,
          color: { dark: '#090d16', light: '#ffffff' },
        })
          .then(url => {
            setQrCodeDataUrls(prev => ({ ...prev, [ticket.id]: url }));
          })
          .catch(err => console.error('Error generating QR', err));
      });
    }
  }, [liveOrder]);

  if (!isOpen || !liveOrder || liveOrder.tickets.length === 0) return null;

  const currentTicket = selectedTicket || liveOrder.tickets[activeTicketIndex] || liveOrder.tickets[0];
  const qrImage = qrCodeDataUrls[currentTicket.id];

  const isPaid = liveOrder.paymentStatus === 'paid';
  const isPendingManual = liveOrder.paymentStatus === 'pending_manual_verification';
  const isPendingAuto = liveOrder.paymentStatus === 'pending';
  const isRejected = liveOrder.paymentStatus === 'payment_rejected';

  // Live Midtrans / Payment Status Check
  const handleCheckStatus = async () => {
    setIsCheckingPayment(true);
    setCheckStatusFeedback(null);
    try {
      const res = await api.checkMidtransStatus(liveOrder.orderNumber);
      if (res.isPaid && res.order) {
        setLiveOrder(res.order);
        onOrderUpdated?.(res.order);
        setCheckStatusFeedback('🎉 Pembayaran TERDETEKSI LUNAS! E-Ticket dan QR Code resmi Anda telah aktif.');
      } else {
        setCheckStatusFeedback(res.message || 'Pembayaran belum terdeteksi. Silakan selesaikan pembayaran terlebih dahulu.');
      }
    } catch (err: any) {
      setCheckStatusFeedback('Gagal memeriksa status: ' + err.message);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handlePrint = () => {
    if (!isPaid) {
      alert('⚠️ Tiket belum dapat dicetak karena pembayaran belum lunas. Selesaikan pembayaran atau tunggu verifikasi Admin Pusat.');
      return;
    }
    window.print();
  };

  const handleDownloadQr = () => {
    if (!isPaid) {
      alert('⚠️ QR Code tiket masuk terkunci karena pembayaran belum lunas.');
      return;
    }
    if (!qrImage) return;
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `QR_PASSTIKET_${currentTicket.ticketCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Direct 1-Click PDF File Generator & Downloader (STRICT: PAID ONLY)
  const handleDownloadPdf = () => {
    if (!isPaid) {
      alert('⚠️ Tiket PDF resmi hanya dapat diunduh setelah pembayaran terkonfirmasi LUNAS.');
      return;
    }
    if (!currentTicket) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5',
      });

      // Background Card
      doc.setFillColor(15, 23, 42); // Navy 900
      doc.roundedRect(8, 8, 132, 194, 5, 5, 'F');

      // Header Banner
      doc.setFillColor(30, 27, 75); // Deep Indigo
      doc.roundedRect(8, 8, 132, 40, 5, 5, 'F');
      doc.rect(8, 44, 132, 4, 'F');

      // Platform & Category Badge
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(56, 189, 248); // Cyan
      doc.text('OFFICIAL E-TICKET PASS • CELEBES EVENT GATEWAY', 14, 18);

      // Event Title
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      const splitTitle = doc.splitTextToSize(liveOrder.eventTitle, 120);
      doc.text(splitTitle, 14, 26);

      // Tier Name
      doc.setFontSize(9.5);
      doc.setTextColor(250, 204, 21); // Amber
      doc.text(`KATEGORI TIKET: ${currentTicket.tierName.toUpperCase()}`, 14, 43);

      // Body Card
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 53, 124, 144, 4, 4, 'F');

      // Attendee info
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('NAMA LENGKAP PESERTA (ATTENDEE):', 18, 63);
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(currentTicket.attendeeName, 18, 70);

      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('EMAIL PENDAFTAR:', 18, 77);
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(currentTicket.attendeeEmail, 18, 82);

      // Ticket Code Strip
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(18, 88, 112, 18, 2, 2, 'F');

      doc.setFontSize(7.5);
      doc.setTextColor(29, 78, 216);
      doc.text(`NOMOR ORDER: ${liveOrder.orderNumber}`, 22, 95);
      doc.setFontSize(10);
      doc.text(`KODE TIKET: ${currentTicket.ticketCode}`, 22, 102);

      // Status
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('STATUS VERIFIKASI & MASUK:', 18, 114);
      doc.setFontSize(9);
      doc.setTextColor(5, 150, 105);
      doc.text('LUNAS & TERVERIFIKASI (SIAP CHECK-IN)', 18, 120);

      // QR Code
      if (qrImage) {
        doc.addImage(qrImage, 'PNG', 49, 126, 50, 50);
      }

      // Instruction
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Tunjukkan file PDF atau QR Code ini kepada panitia saat tiba di lokasi acara.', 74, 182, { align: 'center' });
      doc.text('1 QR Code hanya berlaku untuk 1 kali verifikasi check-in.', 74, 187, { align: 'center' });

      doc.save(`E-Tiket_${liveOrder.eventTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}_${currentTicket.ticketCode}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print();
    }
  };

  // Generate & Download Standalone Offline HTML Ticket File (STRICT: PAID ONLY)
  const handleDownloadTicketFile = () => {
    if (!isPaid) {
      alert('⚠️ File tiket HTML mandiri hanya dapat diunduh setelah pembayaran terkonfirmasi LUNAS.');
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Ticket: ${liveOrder.eventTitle} - ${currentTicket.ticketCode}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #1e293b; padding: 24px; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .ticket-card { width: 100%; max-width: 640px; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border: 2px solid #334155; }
    .ticket-header { background: linear-gradient(135deg, #090d16 0%, #1e1b4b 100%); color: #ffffff; padding: 24px; border-bottom: 2px dashed #cbd5e1; position: relative; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(147, 197, 253, 0.3); }
    .title { font-size: 22px; font-weight: 800; margin-top: 8px; color: #ffffff; }
    .tier-badge { font-size: 14px; font-weight: 800; color: #38bdf8; margin-top: 4px; }
    .ticket-body { padding: 24px; display: grid; grid-template-columns: 1fr 180px; gap: 20px; align-items: center; }
    .info-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em; }
    .info-value { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .info-sub { font-size: 12px; color: #64748b; }
    .ticket-code { display: inline-block; font-family: monospace; font-size: 13px; font-weight: 700; background: #eff6ff; color: #1d4ed8; padding: 4px 8px; border-radius: 6px; margin-top: 4px; }
    .qr-container { text-align: center; border-left: 1px dashed #cbd5e1; padding-left: 20px; }
    .qr-img { width: 160px; height: 160px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .qr-desc { font-size: 10px; font-weight: 700; color: #475569; margin-top: 6px; }
    .ticket-footer { background: #f8fafc; padding: 14px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .btn-print { margin-top: 20px; padding: 12px 28px; background: #2563eb; color: #ffffff; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.4); }
    .btn-print:hover { background: #1d4ed8; }
    @media print {
      body { background: white; padding: 0; }
      .btn-print, .no-print { display: none !important; }
      .ticket-card { box-shadow: none; border: 2px solid #000; width: 100%; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="ticket-card">
    <div class="ticket-header">
      <span class="badge">Official E-Ticket Pass</span>
      <h1 class="title">${liveOrder.eventTitle}</h1>
      <p class="tier-badge">Kategori: ${currentTicket.tierName}</p>
    </div>
    <div class="ticket-body">
      <div>
        <div style="margin-bottom: 12px;">
          <p class="info-label">Nama Peserta (Attendee)</p>
          <p class="info-value">${currentTicket.attendeeName}</p>
          <p class="info-sub">${currentTicket.attendeeEmail}</p>
        </div>
        <div style="margin-bottom: 12px;">
          <p class="info-label">Nomor Order & Kode Tiket</p>
          <p class="info-sub">${liveOrder.orderNumber}</p>
          <p class="ticket-code">${currentTicket.ticketCode}</p>
        </div>
        <div>
          <p class="info-label">Status Verifikasi & Masuk</p>
          <p style="font-size: 12px; font-weight: 800; color: #059669;">
            ✓ Pembayaran Lunas (Tiket Aktif & Sah)
          </p>
        </div>
      </div>
      <div class="qr-container">
        <img class="qr-img" src="${qrImage || ''}" alt="QR Code">
        <p class="qr-desc">Scan saat registrasi di gerbang masuk</p>
      </div>
    </div>
    <div class="ticket-footer">
      <span>Terverifikasi secara kriptografis oleh Platform Celebes Event</span>
      <span style="font-family: monospace;">KODE: ${currentTicket.ticketCode}</span>
    </div>
  </div>
  <button class="btn-print no-print" onclick="window.print()">Cetak Tiket / Simpan sebagai PDF</button>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tiket_${liveOrder.eventTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${currentTicket.ticketCode}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddToCalendar = () => {
    const title = encodeURIComponent(liveOrder.eventTitle);
    const details = encodeURIComponent(`Tiket Resmi: ${currentTicket.ticketCode}\nPemesan: ${currentTicket.attendeeName}\nCelebes Event Platform`);
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
    window.open(googleCalendarUrl, '_blank');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentTicket.ticketCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[96vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Bar */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <TicketIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                {isPaid ? 'E-Ticket Resmi & File Masuk' : 'Status Tagihan & Pendaftaran Tiket'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isPaid ? 'Tiket aktif dan siap digunakan untuk check-in di lokasi' : 'Tiket terkunci hingga pembayaran terdeteksi/disetujui'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={!isPaid}
              className={`p-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                isPaid 
                  ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer' 
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
              title={isPaid ? 'Unduh Tiket Resmi (.PDF)' : 'Terkunci - Pembayaran belum lunas'}
            >
              {!isPaid ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Unduh PDF</span>
            </button>
            <button
              onClick={handleDownloadTicketFile}
              disabled={!isPaid}
              className={`p-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                isPaid 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer' 
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
              title={isPaid ? 'Unduh File Tiket (.HTML)' : 'Terkunci - Pembayaran belum lunas'}
            >
              {!isPaid ? <Lock className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Unduh HTML</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={!isPaid}
              className={`p-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                isPaid 
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer' 
                  : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              {!isPaid ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Printer className="w-3.5 h-3.5 text-blue-400" />}
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Template Selector Bar (no-print) */}
        <div className="bg-slate-50 px-4 sm:px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="font-bold text-slate-700">Pilihan Template E-Tiket:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setSelectedTemplate('modern')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                selectedTemplate === 'modern'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              ⚡ Modern Pass
            </button>
            <button
              onClick={() => setSelectedTemplate('festival')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                selectedTemplate === 'festival'
                  ? 'bg-purple-900 text-purple-200 shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              🎉 Festival VIP Holo
            </button>
            <button
              onClick={() => setSelectedTemplate('corporate')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                selectedTemplate === 'corporate'
                  ? 'bg-blue-900 text-blue-200 shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              🏢 Seminar Badge
            </button>
            <button
              onClick={() => setSelectedTemplate('vintage')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                selectedTemplate === 'vintage'
                  ? 'bg-amber-900 text-amber-200 shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              🎫 Classic Boarding Stub
            </button>
          </div>
        </div>

        {/* Ticket Selector if order has multiple tickets */}
        {liveOrder.tickets.length > 1 && !selectedTicket && (
          <div className="bg-slate-100 px-6 py-2 flex items-center gap-2 overflow-x-auto border-b border-slate-200 no-print text-xs">
            <span className="font-bold text-slate-600 shrink-0">Pilih Tiket:</span>
            {liveOrder.tickets.map((t, idx) => (
              <button
                key={t.id}
                onClick={() => setActiveTicketIndex(idx)}
                className={`px-3 py-1 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                  activeTicketIndex === idx
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tiket #{idx + 1} ({t.tierName})
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Printable E-Ticket Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" id="printable-ticket">
          
          {/* Status Alert Banners (STRICT & CLEAR) */}
          {isPendingManual && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <span className="font-extrabold text-sm block text-amber-900">
                    Status: Menunggu Pemeriksaan & Verifikasi Admin Pusat (BELUM LUNAS)
                  </span>
                  <span className="text-[11px] text-amber-800 leading-relaxed block mt-0.5">
                    Bukti transfer manual Anda telah terkirim. Pemeriksaan mutasi dilakukan langsung oleh <strong>Admin Pusat Celebes Event</strong>. Tiket resmi dan QR Code masuk akan terbuka secara otomatis segera setelah disetujui.
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-200/90 rounded-xl font-mono font-extrabold text-amber-950 text-xs self-start sm:self-auto shrink-0 border border-amber-300">
                {liveOrder.orderNumber}
              </span>
            </div>
          )}

          {isPendingAuto && (
            <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-950 shadow-xs">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <span className="font-extrabold text-sm block text-blue-900">
                    Status: Menunggu Pembayaran Terdeteksi (BELUM LUNAS)
                  </span>
                  <span className="text-[11px] text-blue-800 leading-relaxed block mt-0.5">
                    Pembayaran Anda belum tercatat lunas. Segera selesaikan transaksi di gateway / QRIS Midtrans Anda. Tiket dan QR Code check-in hanya dapat dicetak setelah sistem mendeteksi pembayaran lunas.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={isCheckingPayment}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingPayment ? 'animate-spin' : ''}`} />
                <span>{isCheckingPayment ? 'Memeriksa...' : 'Cek Status Midtrans'}</span>
              </button>
            </div>
          )}

          {isRejected && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl flex items-start gap-3 text-xs text-red-950 shadow-xs">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-sm block text-red-900">
                  Status: Pembayaran Ditolak oleh Admin Pusat
                </span>
                <span className="text-[11px] text-red-800 block mt-0.5">
                  Alasan: {liveOrder.rejectionReason || 'Bukti transfer tidak valid atau nominal tidak sesuai.'} Silakan hubungi admin pusat atau ulangi pemesanan.
                </span>
              </div>
            </div>
          )}

          {isPaid && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-xs text-emerald-950 shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-extrabold text-sm text-emerald-900 block">
                    ✓ Pembayaran Lunas & Terverifikasi
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    E-Ticket resmi telah aktif dan siap dicetak atau diunduh untuk registrasi gerbang masuk.
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs text-emerald-800 font-bold bg-emerald-100 px-2.5 py-1 rounded-lg">
                {liveOrder.orderNumber}
              </span>
            </div>
          )}

          {checkStatusFeedback && (
            <div className="p-3 bg-slate-900 text-white text-xs rounded-xl flex items-center justify-between animate-in fade-in">
              <span>{checkStatusFeedback}</span>
              <button
                type="button"
                onClick={() => setCheckStatusFeedback(null)}
                className="text-slate-400 hover:text-white ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TEMPLATE 1: MODERN CYBER PASS */}
          {selectedTemplate === 'modern' && (
            <div className="border-2 border-slate-900 rounded-3xl overflow-hidden bg-white shadow-xl relative transition-all">
              <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-slate-300">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                      Official E-Pass • Modern Edition
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">CELEBES EVENT GATEWAY</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold mt-1 text-white leading-tight">
                    {liveOrder.eventTitle}
                  </h2>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Kategori Tiket</span>
                  <span className="text-sm sm:text-base font-extrabold text-cyan-400">
                    {currentTicket.tierName}
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                <div className="sm:col-span-7 space-y-3.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                      Nama Peserta (Attendee)
                    </span>
                    <span className="text-base font-extrabold text-slate-900 block">
                      {currentTicket.attendeeName}
                    </span>
                    <span className="text-[11px] text-slate-500">{currentTicket.attendeeEmail}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Kode Tiket</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                          {currentTicket.ticketCode}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="text-[10px] text-slate-500 hover:text-slate-800 p-0.5"
                          title="Salin Kode"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : 'Salin'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Status Tiket</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        isPaid
                          ? (currentTicket.checkInStatus === 'checked_in' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                          : 'bg-amber-50 text-amber-800 border border-amber-300'
                      }`}>
                        {isPaid 
                          ? (currentTicket.checkInStatus === 'checked_in' ? 'SUDAH CHECK-IN' : 'LUNAS (SIAP CHECK-IN)')
                          : (isPendingManual ? 'MENUNGGU VERIFIKASI ADMIN' : 'BELUM LUNAS')}
                      </span>
                    </div>
                  </div>

                  {currentTicket.responses && currentTicket.responses.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1 bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">
                        Data Khusus Registrasi:
                      </span>
                      {currentTicket.responses.map(resp => (
                        <div key={resp.id} className="flex justify-between text-[11px]">
                          <span className="text-slate-600 truncate max-w-[150px]">{resp.fieldLabel}:</span>
                          <span className="font-bold text-slate-900 truncate max-w-[180px]">{resp.responseValue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-5 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-slate-200 pt-4 sm:pt-0 sm:pl-4 text-center">
                  {isPaid ? (
                    <>
                      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-md">
                        {qrImage ? (
                          <img src={qrImage} alt="QR Code Check-in" className="w-36 h-36 mx-auto" />
                        ) : (
                          <div className="w-36 h-36 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">
                            Memuat QR...
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-700 mt-2 block">
                        Scan saat tiba di lokasi acara
                      </span>
                      <span className="text-[9px] text-slate-400 mt-0.5">
                        1 QR Code khusus untuk 1 kali check-in
                      </span>
                    </>
                  ) : (
                    <div className="w-36 h-36 bg-slate-100 rounded-2xl border-2 border-dashed border-amber-300 flex flex-col items-center justify-center p-3 text-center shadow-inner">
                      <Lock className="w-8 h-8 text-amber-500 mb-1" />
                      <span className="text-[11px] font-extrabold text-slate-900 leading-tight">QR Code Terkunci</span>
                      <span className="text-[9px] text-amber-700 mt-1 leading-snug">
                        Aktif otomatis setelah pembayaran diverifikasi LUNAS
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Kriptografi HMAC & Enkripsi Celebes Event</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">
                  REF: {liveOrder.paymentReference || liveOrder.orderNumber}
                </span>
              </div>
            </div>
          )}

          {/* TEMPLATE 2: FESTIVAL & CONCERT VIP HOLO */}
          {selectedTemplate === 'festival' && (
            <div className="border-2 border-purple-950 rounded-3xl overflow-hidden bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 text-white shadow-2xl relative">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-16 h-3.5 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                  <div className="w-8 h-1 rounded-full bg-slate-900" />
                </div>
              </div>

              <div className="px-6 py-4 text-center border-b border-purple-800/40">
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm uppercase tracking-widest inline-block">
                  ★ VIP ALL ACCESS PASS ★
                </span>
                <h2 className="text-xl sm:text-2xl font-black mt-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-300">
                  {liveOrder.eventTitle}
                </h2>
                <p className="text-xs font-bold text-pink-300 mt-1 uppercase tracking-wider">
                  {currentTicket.tierName}
                </p>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                <div className="sm:col-span-7 space-y-3 text-xs">
                  <div className="bg-purple-900/40 p-3 rounded-2xl border border-purple-500/30">
                    <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">Attendee</span>
                    <span className="text-lg font-black text-white block">{currentTicket.attendeeName}</span>
                    <span className="text-[11px] text-purple-300">{currentTicket.attendeeEmail}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">KODE TIKET</span>
                      <span className="font-mono font-bold text-yellow-400 text-xs">{currentTicket.ticketCode}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">STATUS TIKET</span>
                      <span className={`font-bold text-xs ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isPaid ? 'LUNAS (TERVERIFIKASI)' : 'BELUM LUNAS'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-5 flex flex-col items-center justify-center text-center">
                  {isPaid ? (
                    <>
                      <div className="bg-white p-2.5 rounded-2xl shadow-xl ring-4 ring-pink-500/20">
                        {qrImage ? (
                          <img src={qrImage} alt="QR Code" className="w-36 h-36 mx-auto" />
                        ) : (
                          <div className="w-36 h-36 bg-slate-800 animate-pulse rounded-xl" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-purple-300 mt-2 block font-bold">
                        Scan for Holographic Access
                      </span>
                    </>
                  ) : (
                    <div className="w-36 h-36 bg-slate-900/90 rounded-2xl border-2 border-dashed border-purple-500/40 flex flex-col items-center justify-center p-3 text-center">
                      <Lock className="w-8 h-8 text-pink-400 mb-1" />
                      <span className="text-xs font-bold text-white">QR Terkunci</span>
                      <span className="text-[9px] text-purple-300 mt-0.5">Menunggu Pembayaran</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-purple-950/80 px-6 py-2.5 border-t border-purple-900 flex items-center justify-between text-[10px] text-purple-300">
                <span>Celebes Live Experience</span>
                <span className="font-mono">NO: {currentTicket.ticketCode}</span>
              </div>
            </div>
          )}

          {/* TEMPLATE 3: CORPORATE SEMINAR BADGE */}
          {selectedTemplate === 'corporate' && (
            <div className="border-2 border-slate-300 rounded-2xl bg-white shadow-lg overflow-hidden">
              <div className="bg-blue-900 text-white p-3 text-center flex items-center justify-between px-6">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-300" />
                  <span className="text-xs font-bold uppercase tracking-wider">Conference & Executive Delegate</span>
                </div>
                <span className="text-[11px] font-mono bg-blue-950 px-2.5 py-0.5 rounded-md text-blue-200">
                  DELEGATE PASS
                </span>
              </div>

              <div className="p-6 text-center border-b border-slate-200 bg-slate-50">
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-800 font-extrabold text-2xl flex items-center justify-center mx-auto mb-2 border-2 border-blue-600 shadow-xs">
                  {currentTicket.attendeeName.charAt(0)}
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">{currentTicket.attendeeName}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{currentTicket.attendeeEmail}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                  <Award className="w-3.5 h-3.5" />
                  <span>{currentTicket.tierName}</span>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Kegiatan</span>
                    <span className="font-bold text-slate-800 text-sm">{liveOrder.eventTitle}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">ID Registrasi</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      {currentTicket.ticketCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Status Verifikasi</span>
                    <span className={`font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {isPaid ? 'Lunas & Terverifikasi' : 'Belum Lunas (Menunggu Pembayaran)'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center text-center">
                  {isPaid ? (
                    <>
                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                        {qrImage && <img src={qrImage} alt="QR" className="w-32 h-32" />}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono mt-1.5">Official Check-In Badge</span>
                    </>
                  ) : (
                    <div className="w-32 h-32 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-2 text-center">
                      <Lock className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-600">Badge Belum Aktif</span>
                      <span className="text-[8px] text-slate-400 mt-0.5">Selesaikan Pembayaran</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE 4: VINTAGE BOARDING PASS STUB */}
          {selectedTemplate === 'vintage' && (
            <div className="border-2 border-amber-900 rounded-2xl bg-amber-50/70 overflow-hidden shadow-md font-mono text-slate-800 relative">
              <div className="bg-amber-900 text-amber-100 p-4 flex justify-between items-center px-6">
                <div>
                  <span className="text-[10px] uppercase tracking-widest block text-amber-300">BOARDING PASS • EVENT TICKET</span>
                  <h3 className="text-base font-bold text-white">{liveOrder.eventTitle}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-amber-300">SEAT / TIER</span>
                  <span className="text-sm font-bold text-white block">{currentTicket.tierName}</span>
                </div>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center relative">
                <div className="sm:col-span-8 space-y-3 text-xs border-b sm:border-b-0 sm:border-r border-dashed border-amber-300 pb-4 sm:pb-0 sm:pr-4">
                  <div>
                    <span className="text-[10px] text-amber-800 block uppercase">PASSENGER / ATTENDEE</span>
                    <span className="text-base font-extrabold text-slate-900">{currentTicket.attendeeName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-amber-800 block uppercase">ORDER REF</span>
                      <span className="font-bold text-slate-800">{liveOrder.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-800 block uppercase">TICKET NO</span>
                      <span className="font-bold text-amber-900">{currentTicket.ticketCode}</span>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-4 flex flex-col items-center justify-center text-center">
                  {isPaid ? (
                    <>
                      <div className="bg-white p-1.5 rounded-lg border border-amber-200">
                        {qrImage && <img src={qrImage} alt="QR" className="w-28 h-28" />}
                      </div>
                      <span className="text-[9px] text-amber-900 mt-1 uppercase font-bold">TEAR OFF AT GATE</span>
                    </>
                  ) : (
                    <div className="w-28 h-28 bg-amber-100/60 rounded-lg border-2 border-dashed border-amber-400 flex flex-col items-center justify-center p-2 text-center">
                      <Lock className="w-6 h-6 text-amber-700 mb-1" />
                      <span className="text-[9px] font-bold text-amber-900">QR Terkunci</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-amber-100/80 px-6 py-2 border-t border-amber-200 text-[10px] flex justify-between text-amber-900">
                <span>CELEBES EVENT TICKETING SYSTEM</span>
                <span>STATUS: {isPaid ? 'LUNAS (VERIFIED)' : 'BELUM LUNAS'}</span>
              </div>
            </div>
          )}

          {/* Quick Actions & Download Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 no-print border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={!isPaid}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors ${
                  isPaid 
                    ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {!isPaid ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                <span>Unduh Tiket (PDF)</span>
              </button>

              <button
                onClick={handleDownloadTicketFile}
                disabled={!isPaid}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors ${
                  isPaid 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {!isPaid ? <Lock className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                <span>Unduh File (.HTML)</span>
              </button>

              <button
                onClick={handleDownloadQr}
                disabled={!isPaid}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isPaid 
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer' 
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                {!isPaid ? <Lock className="w-3.5 h-3.5" /> : <TicketIcon className="w-3.5 h-3.5" />}
                <span>Unduh QR (.PNG)</span>
              </button>

              {isPaid && (
                <button
                  onClick={handleAddToCalendar}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer hidden sm:flex"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Google Calendar</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer ml-auto"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
