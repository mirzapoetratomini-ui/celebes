import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Clock, 
  Eye, 
  Share2, 
  Check, 
  Tag, 
  UserCheck, 
  ExternalLink,
  MessageCircle,
  Send,
  Sparkles
} from 'lucide-react';
import { EventNews } from '../types';

interface NewsDetailModalProps {
  news: EventNews | null;
  onClose: () => void;
  onBrowseEvents?: () => void;
}

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  news,
  onClose,
  onBrowseEvents,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!news) return null;

  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}/#news-${news.slug}` : '';

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`📢 *${news.title}*\n\n${news.summary}\n\nBaca informasi selengkapnya di Celebes Event:\n${currentUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(`📢 ${news.title}\n\n${news.summary}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${text}`, '_blank');
  };

  // Color mapping per category
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Event Musik & Konser':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Event Olahraga':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Running & Marathon':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Festival Budaya & Wisata':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Pameran & Konferensi':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-lg"
          aria-label="Tutup Berita"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Banner Image */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-t-3xl bg-slate-900">
          <img
            src={news.imageUrl}
            alt={news.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

          {/* Top badges */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-xs ${getCategoryBadgeClass(news.category)}`}>
              {news.category}
            </span>
            {news.isFeatured && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Berita Utama</span>
              </span>
            )}
          </div>
        </div>

        {/* Article Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Metadata bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>{news.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {new Date(news.publishedAt || news.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{news.readTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>{news.viewsCount.toLocaleString('id-ID')} Kali Dibaca</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
            {news.title}
          </h1>

          {/* Event Context Card (Date & Location) */}
          {(news.eventDate || news.eventLocation) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-xs">
              <div className="space-y-1">
                {news.eventDate && (
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Jadwal Event: <strong>{news.eventDate}</strong></span>
                  </div>
                )}
                {news.eventLocation && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Lokasi: {news.eventLocation}</span>
                  </div>
                )}
              </div>

              {onBrowseEvents && (
                <button
                  onClick={() => {
                    onClose();
                    onBrowseEvents();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Cari Tiket Event</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Summary Lead Paragraph */}
          <p className="text-sm sm:text-base font-semibold text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border-l-4 border-blue-600 italic">
            "{news.summary}"
          </p>

          {/* Full Content Body */}
          <div className="text-sm sm:text-base text-slate-800 leading-relaxed space-y-4 whitespace-pre-line font-normal">
            {news.content}
          </div>

          {/* Tags */}
          {news.tags && news.tags.length > 0 && (
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                <span>Tag Terkait:</span>
              </span>
              {news.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Share Buttons */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Share2 className="w-4 h-4 text-blue-600" />
              <span>Bagikan Berita Ini ke Teman:</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleShareWhatsApp}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={handleShareTelegram}
                className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>Telegram</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 text-slate-500" />
                    <span>Salin Tautan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
