import React, { useState } from 'react';
import { 
  Ticket as TicketIcon, 
  Calendar, 
  MapPin, 
  Printer, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  XCircle,
  Eye,
  FileText,
  AlertCircle,
  X
} from 'lucide-react';
import { Order, Ticket, User } from '../types';
import { formatRupiah } from '../utils/ticketing-logic';

interface UserTicketsViewProps {
  currentUser: User;
  orders: Order[];
  onOpenTicketInvoice: (order: Order, ticket?: Ticket) => void;
  onExploreEvents: () => void;
}

export const UserTicketsView: React.FC<UserTicketsViewProps> = ({
  currentUser,
  orders,
  onOpenTicketInvoice,
  onExploreEvents,
}) => {
  const [selectedProofOrder, setSelectedProofOrder] = useState<Order | null>(null);

  // Filter user's orders
  const myOrders = orders.filter(
    o => o.userId === currentUser.id || o.buyerEmail === currentUser.email
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              Tiket Saya & Registrasi
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">{currentUser.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Daftar Tiket & Bukti Pendaftaran Event
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Unduh file tiket (.html), pilih template e-ticket resmi, atau simpan ke PDF untuk ditunjukkan saat check-in di lokasi.
          </p>
        </div>

        <button
          onClick={onExploreEvents}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Jelajah Event Lain</span>
        </button>
      </div>

      {myOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <TicketIcon className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Belum Ada Tiket yang Dipesan</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Anda belum memesan tiket event apapun. Jelajahi event menarik dan dapatkan tiket Anda sekarang!
            </p>
          </div>
          <button
            onClick={onExploreEvents}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <span>Cari Event Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {myOrders.map(order => {
            const isPendingManual = order.paymentStatus === 'pending_manual_verification';
            const isPaid = order.paymentStatus === 'paid';
            const isRejected = order.paymentStatus === 'payment_rejected';

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
              >
                {/* Order Bar */}
                <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-blue-700">{order.orderNumber}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-extrabold text-slate-800">{formatRupiah(order.totalAmount)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPendingManual && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Menunggu Verifikasi Manual</span>
                      </span>
                    )}

                    {isPaid && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Lunas ({order.paymentChannel || order.paymentMethod})</span>
                      </span>
                    )}

                    {isRejected && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-600" />
                        <span>Pembayaran Ditolak</span>
                      </span>
                    )}

                    {order.paymentProofUrl && (
                      <button
                        type="button"
                        onClick={() => setSelectedProofOrder(order)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Lihat Bukti Transfer"
                      >
                        <Eye className="w-3 h-3 text-blue-600" />
                        <span>Bukti Transfer</span>
                      </button>
                    )}

                    <button
                      onClick={() => onOpenTicketInvoice(order)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isPaid
                          ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                      }`}
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-400" />
                      <span>{isPaid ? 'Buka & Unduh E-Ticket' : 'Lihat Status Tiket'}</span>
                    </button>
                  </div>
                </div>

                {/* Status Notice if Pending or Rejected */}
                {isPendingManual && (
                  <div className="bg-amber-50/80 px-6 py-2.5 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Bukti transfer Anda telah dikirim (Bank: <strong>{order.senderBank || 'Transfer Manual'}</strong> a/n <strong>{order.senderAccountName || order.buyerName}</strong>). Tiket resmi & QR code aktif otomatis begitu disetujui oleh panitia.
                      </span>
                    </div>
                  </div>
                )}

                {isRejected && (
                  <div className="bg-red-50 px-6 py-2.5 border-b border-red-200 text-xs text-red-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      <strong>Alasan Penolakan:</strong> {order.rejectionReason || 'Nominal tidak sesuai atau mutasi bank belum terverifikasi.'} Silakan hubungi panitia acara.
                    </span>
                  </div>
                )}

                {/* Tickets list */}
                <div className="p-6 space-y-4">
                  <h3 className="font-extrabold text-slate-900 text-base">{order.eventTitle}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {order.tickets.map((ticket, idx) => (
                      <div
                        key={ticket.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                                Tiket #{idx + 1} • {ticket.tierName}
                              </span>
                              <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                                {ticket.attendeeName}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ticket.checkInStatus === 'checked_in'
                                  ? 'bg-amber-100 text-amber-800'
                                  : isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {ticket.checkInStatus === 'checked_in'
                                ? 'Sudah Check-In'
                                : isPaid
                                ? 'Aktif (Siap Masuk)'
                                : 'Menunggu Verifikasi'}
                            </span>
                          </div>

                          <div className="mt-2 text-xs text-slate-500 font-mono bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                            <span>KODE: {ticket.ticketCode}</span>
                            {isPaid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-600" />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                          <span className="text-[11px] text-slate-400">Tersedia 4 Template Tiket</span>
                          <button
                            onClick={() => onOpenTicketInvoice(order, ticket)}
                            className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Buka Template E-Ticket</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL VIEW BUKTI TRANSFER PESERTA */}
      {selectedProofOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Bukti Transfer Anda</span>
                <h4 className="font-bold text-sm text-white">{selectedProofOrder.orderNumber}</h4>
              </div>
              <button
                onClick={() => setSelectedProofOrder(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-center">
              <div className="bg-slate-100 rounded-2xl p-2 border border-slate-200 flex items-center justify-center max-h-[50vh] overflow-hidden">
                <img
                  src={selectedProofOrder.paymentProofUrl}
                  alt="Bukti Transfer Anda"
                  className="max-h-[46vh] w-auto object-contain rounded-xl shadow-xs"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl text-left text-xs space-y-1 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Pengirim:</span>
                  <span className="font-bold text-slate-800">{selectedProofOrder.senderBank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Atas Nama:</span>
                  <span className="font-bold text-slate-800">{selectedProofOrder.senderAccountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Nominal:</span>
                  <span className="font-bold text-blue-700">{formatRupiah(selectedProofOrder.totalAmount)}</span>
                </div>
                {selectedProofOrder.transferNotes && (
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Catatan:</span>
                    <span className="italic text-slate-700">{selectedProofOrder.transferNotes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedProofOrder(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
