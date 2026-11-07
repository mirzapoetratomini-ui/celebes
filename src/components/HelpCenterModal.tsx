import React, { useState, useEffect } from 'react';
import { 
  X, 
  HelpCircle, 
  Send, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  Phone, 
  MessageCircle,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { FaqItem, SupportTicket, PlatformSettings } from '../types';

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: PlatformSettings;
}

export const HelpCenterModal: React.FC<HelpCenterModalProps> = ({ isOpen, onClose, settings }) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'report' | 'check'>('faq');
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Form kendala
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'pembayaran' as SupportTicket['category'],
    priority: 'sedang' as SupportTicket['priority'],
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<SupportTicket | null>(null);

  // Check ticket
  const [searchEmail, setSearchEmail] = useState('');
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [searchingTickets, setSearchingTickets] = useState(false);
  const [hasSearchedTickets, setHasSearchedTickets] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFaqs();
    }
  }, [isOpen]);

  const loadFaqs = async () => {
    try {
      const data = await api.getFaqs();
      setFaqs(data);
      if (data.length > 0) {
        setExpandedFaqId(data[0].id);
      }
    } catch {
      // Fallback
    }
  };

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(faqs.map((f) => f.category)))];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
    const matchesCat = selectedFaqCategory === 'all' || faq.category === selectedFaqCategory;
    return matchesSearch && matchesCat;
  });

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      alert('Mohon lengkapi semua kolom wajib');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createSupportTicket(formData);
      setSubmittedTicket(res.ticket);
      setFormData({
        name: '',
        email: '',
        phone: '',
        category: 'pembayaran',
        priority: 'sedang',
        subject: '',
        message: '',
      });
    } catch {
      alert('Gagal mengirim laporan kendala. Silakan coba kembali.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchMyTickets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    setSearchingTickets(true);
    try {
      const tickets = await api.getSupportTickets({ email: searchEmail.trim() });
      setMyTickets(tickets);
      setHasSearchedTickets(true);
    } catch {
      setMyTickets([]);
      setHasSearchedTickets(true);
    } finally {
      setSearchingTickets(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-bold">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Pusat Bantuan & Layanan Kendala</h2>
              <p className="text-xs sm:text-sm text-emerald-100">
                Solusi cepat untuk kendala tiket, pembayaran, atau penyelenggaraan event
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/80 px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('faq')}
            className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'faq'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Tanya Jawab (FAQ)
          </button>
          <button
            onClick={() => {
              setActiveTab('report');
              setSubmittedTicket(null);
            }}
            className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'report'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Sampaikan Kendala
          </button>
          <button
            onClick={() => setActiveTab('check')}
            className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'check'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Cek Status Kendala
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* TAB 1: FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-6">
              {/* Search & Categories */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari kendala, contoh: tiket belum masuk, QRIS, refund..."
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                {categories.length > 2 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedFaqCategory(cat)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap capitalize transition-colors ${
                          selectedFaqCategory === cat
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cat === 'all' ? 'Semua Kategori' : cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* FAQ Accordion */}
              <div className="space-y-3">
                {filteredFaqs.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <HelpCircle className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium">Tidak ada FAQ yang cocok dengan pencarian Anda.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Silakan buka tab "Sampaikan Kendala" untuk bertanya langsung pada tim dukungan.
                    </p>
                  </div>
                ) : (
                  filteredFaqs.map((faq) => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-300 transition-colors"
                      >
                        <button
                          onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                          className="w-full text-left p-4 bg-white hover:bg-emerald-50/40 flex items-center justify-between gap-4 font-semibold text-gray-800 text-sm sm:text-base transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {faq.question}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="p-4 bg-gray-50/70 border-t border-gray-100 text-sm text-gray-600 leading-relaxed">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Contacts */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-emerald-950 text-sm">Masih butuh bantuan langsung?</h4>
                  <p className="text-xs text-emerald-700">Hubungi kami melalui kontak resmi:</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {settings?.contactPhone && (
                    <a
                      href={`https://wa.me/${settings.contactPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp Bantuan
                    </a>
                  )}
                  {settings?.contactEmail && (
                    <a
                      href={`mailto:${settings.contactEmail}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-50 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Email Dukungan
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SAMPAIKAN KENDALA */}
          {activeTab === 'report' && (
            <div>
              {submittedTicket ? (
                <div className="text-center py-8 px-4 max-w-lg mx-auto bg-emerald-50 rounded-2xl border border-emerald-200 animate-in fade-in">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-900">Kendala Berhasil Dilaporkan!</h3>
                  <p className="text-sm text-emerald-700 mt-2">
                    Laporan Anda telah diterima oleh tim Super Admin dan sedang ditinjau.
                  </p>
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 my-4 text-left shadow-xs">
                    <div className="flex justify-between items-center text-xs text-gray-500 pb-2 border-b border-gray-100">
                      <span>Nomor Tiket Bantuan:</span>
                      <span className="font-mono font-bold text-emerald-800 text-sm">
                        {submittedTicket.ticketNumber}
                      </span>
                    </div>
                    <div className="pt-2 text-xs text-gray-700 space-y-1">
                      <p><strong>Subjek:</strong> {submittedTicket.subject}</p>
                      <p><strong>Kategori:</strong> <span className="capitalize">{submittedTicket.category}</span></p>
                      <p><strong>Email Notifikasi:</strong> {submittedTicket.email}</p>
                    </div>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setSearchEmail(submittedTicket.email);
                        setActiveTab('check');
                        api.getSupportTickets({ email: submittedTicket.email }).then(setMyTickets);
                        setHasSearchedTickets(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
                    >
                      Pantau Status Tiket Ini
                    </button>
                    <button
                      onClick={() => setSubmittedTicket(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold hover:bg-gray-300"
                    >
                      Kirim Laporan Lain
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitReport} className="space-y-4 max-w-2xl mx-auto">
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span>
                      Jelaskan permasalahan Anda secara spesifik (misal: ID transaksi, bukti transfer, atau alamat email pendaftar) agar dapat diselesaikan lebih cepat.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Contoh: Rian Pratama"
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Alamat Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@anda.com"
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">No. WhatsApp / HP</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="081234567890"
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Kategori Kendala <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value as SupportTicket['category'] })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="pembayaran">Pembayaran & Konfirmasi</option>
                        <option value="tiket">E-Tiket & Check-in</option>
                        <option value="event">Penyelenggara / Buat Event</option>
                        <option value="akun">Akun & Profil</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Tingkat Urgensi</label>
                      <select
                        value={formData.priority}
                        onChange={(e) =>
                          setFormData({ ...formData, priority: e.target.value as SupportTicket['priority'] })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="rendah">Rendah (Pertanyaan umum)</option>
                        <option value="sedang">Sedang (Dalam 24 jam)</option>
                        <option value="tinggi">Tinggi (Event hari ini / pembayaran mendesak)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Judul / Ringkasan Kendala <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Contoh: Sudah bayar manual tapi status tiket belum berubah"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Detail Kendala & Informasi Tambahan <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tuliskan nomor pesanan, nama event, jam pembayaran, atau pesan error yang muncul..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold rounded-xl shadow-md hover:from-emerald-700 hover:to-teal-800 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      'Mengirim Laporan...'
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Kirim Laporan Kendala
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: CEK STATUS KENDALA */}
          {activeTab === 'check' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <form onSubmit={handleSearchMyTickets} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Masukkan email yang digunakan saat kirim kendala..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={searchingTickets}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Cari
                </button>
              </form>

              {searchingTickets && (
                <div className="text-center py-8 text-gray-500">Mencari laporan kendala...</div>
              )}

              {hasSearchedTickets && !searchingTickets && (
                <div className="space-y-4">
                  {myTickets.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200 text-gray-500">
                      <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                      <p className="font-semibold">Tidak ditemukan laporan kendala untuk email ini.</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Pastikan email yang dimasukkan sama persis dengan yang Anda kirimkan.
                      </p>
                    </div>
                  ) : (
                    myTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100">
                          <div>
                            <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                              {ticket.ticketNumber}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              {new Date(ticket.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                              ticket.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ticket.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ticket.status === 'resolved'
                              ? 'Selesai'
                              : ticket.status === 'in_progress'
                              ? 'Diproses'
                              : 'Menunggu Review'}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{ticket.subject}</h4>
                          <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{ticket.message}</p>
                        </div>

                        {ticket.adminReply && (
                          <div className="bg-emerald-50/80 border-l-4 border-emerald-500 p-3 rounded-r-xl">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              Tanggapan Tim Super Admin:
                            </div>
                            <p className="text-xs text-emerald-800 whitespace-pre-line">{ticket.adminReply}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
          <span>{settings?.platformName || 'Celebes Event'} • Layanan Bantuan Resmi</span>
          <span>Jam Layanan: Senin - Minggu (08:00 - 22:00 WITA)</span>
        </div>
      </div>
    </div>
  );
};
