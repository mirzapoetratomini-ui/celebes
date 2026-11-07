import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Video, 
  Users, 
  CheckCircle2, 
  Share2, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Ticket as TicketIcon,
  Plus,
  Minus,
  ArrowRight
} from 'lucide-react';
import { EventItem, TicketTier } from '../types';
import { formatRupiah } from '../utils/ticketing-logic';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  onProceedToCheckout: (event: EventItem, selectedTickets: { tier: TicketTier; quantity: number }[]) => void;
  onOpenShareModal: (event: EventItem) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  onClose,
  event,
  onProceedToCheckout,
  onOpenShareModal,
}) => {
  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});

  if (!isOpen || !event) return null;

  const handleQuantityChange = (tierId: string, delta: number, maxQuota: number, maxPerOrder: number) => {
    setTicketQuantities(prev => {
      const current = prev[tierId] || 0;
      const next = Math.max(0, Math.min(Math.min(maxQuota, maxPerOrder), current + delta));
      return { ...prev, [tierId]: next };
    });
  };

  // Calculate selected summary
  const selectedList = event.tickets
    .map(tier => ({ tier, quantity: ticketQuantities[tier.id] || 0 }))
    .filter(item => item.quantity > 0);

  const totalSelectedTickets = selectedList.reduce((acc, item) => acc + item.quantity, 0);
  const totalSubtotal = selectedList.reduce((acc, item) => acc + (item.tier.price * item.quantity), 0);

  const formattedStartDate = new Date(event.startDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedStartTime = new Date(event.startDate).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedEndTime = new Date(event.endDate).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header Bar */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              {event.category}
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline">•</span>
            <span className="text-xs text-slate-300 hidden sm:inline">Detail Acara & Registrasi Tiket</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenShareModal(event)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Bagikan</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Banner & Title Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 space-y-4">
              <div className="rounded-xl overflow-hidden aspect-16/9 bg-slate-100 shadow-xs relative">
                <img
                  src={event.bannerImage}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                {event.isFeatured && (
                  <div className="absolute top-3 left-3 bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    Event Unggulan
                  </div>
                )}
              </div>

              {/* Creator details */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <img
                  src={event.creatorAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80'}
                  alt={event.creatorName || 'Kreator'}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">Diorganisir oleh:</span>
                    <span className="text-xs font-extrabold text-blue-700">{event.creatorName || 'Festiva Promosindo'}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <p className="text-[11px] text-slate-500">Official Verified Event Organizer</p>
                </div>
              </div>
            </div>

            {/* Quick Metadata Box */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                  {event.title}
                </h1>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {event.shortDescription}
                </p>
              </div>

              {/* Time & Venue Pills */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">{formattedStartDate}</span>
                    <span className="text-slate-500">{formattedStartTime} - {formattedEndTime} WIB</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  {event.locationType === 'online' ? (
                    <>
                      <Video className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">Webinar / Live Online Stream</span>
                        <span className="text-slate-500">Tautan room (Zoom/Meet) akan dikirimkan pada e-ticket</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">{event.venueName || 'Lokasi Fisik'}</span>
                        <span className="text-slate-500">{event.venueAddress || 'Alamat lengkap lokasi acara'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full Event Description */}
          <div className="border-t border-slate-200 pt-5 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Deskripsi Lengkap Acara
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Ticket Selection Section */}
          <div className="border-t border-slate-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <TicketIcon className="w-4 h-4 text-blue-600" />
                  Pilihan Kategori Tiket
                </h3>
                <p className="text-xs text-slate-500">
                  Tentukan jumlah tiket yang ingin Anda pesan
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {event.tickets.map(tier => {
                const remaining = Math.max(0, tier.quota - (tier.soldCount || 0));
                const currentQty = ticketQuantities[tier.id] || 0;
                const isSoldOut = remaining <= 0;

                return (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-xl border transition-all ${
                      currentQty > 0
                        ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20'
                        : isSoldOut
                        ? 'border-slate-200 bg-slate-50 opacity-60'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{tier.name}</h4>
                          {isSoldOut ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                              Habis Terjual
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              (Sisa: {remaining} tiket)
                            </span>
                          )}
                        </div>
                        {tier.description && (
                          <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
                            {tier.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">
                          Maksimal per pemesanan: {tier.maxPerOrder} tiket
                        </p>
                      </div>

                      {/* Price and Counter */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Harga Satuan</span>
                          <span className="font-extrabold text-blue-700 text-base">
                            {formatRupiah(tier.price)}
                          </span>
                        </div>

                        {!isSoldOut ? (
                          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-1 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(tier.id, -1, remaining, tier.maxPerOrder)}
                              disabled={currentQty <= 0}
                              aria-label={`Kurangi jumlah tiket ${tier.name}`}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-slate-800" aria-label={`Jumlah dipilih ${currentQty}`}>
                              {currentQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(tier.id, 1, remaining, tier.maxPerOrder)}
                              disabled={currentQty >= Math.min(remaining, tier.maxPerOrder)}
                              aria-label={`Tambah jumlah tiket ${tier.name}`}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button disabled className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed">
                            Sold Out
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Bar with Sticky Checkout Action */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-slate-500 block">Total Tiket Dipilih:</span>
              <span className="font-bold text-slate-900 text-sm">
                {totalSelectedTickets} Tiket
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-xs text-slate-500 block">Estimasi Subtotal:</span>
              <span className="font-extrabold text-blue-700 text-base sm:text-lg">
                {formatRupiah(totalSubtotal)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Kembali
            </button>
            <button
              onClick={() => onProceedToCheckout(event, selectedList)}
              disabled={totalSelectedTickets === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Lanjut ke Formulir Pendaftaran</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
