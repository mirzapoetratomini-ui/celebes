import React, { useState, useEffect } from 'react';
import { X, Check, Copy, Share2, Sparkles, MessageCircle, Send, Globe, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { EventItem } from '../types';
import { generateSocialShareLinks } from '../utils/ticketing-logic';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [copiedLink, setCopiedLink] = useState<'direct' | 'google' | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (event) {
      const shareUrl = `${window.location.origin}/event/${event.slug}`;
      QRCode.toDataURL(shareUrl, { width: 220, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR code error', err));
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const links = generateSocialShareLinks(
    { title: event.title, slug: event.slug, shortDescription: event.shortDescription },
    window.location.origin
  );

  const handleCopy = (type: 'direct' | 'google', text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">Bagikan Link Pendaftaran Event</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Event Preview snippet */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <img
              src={event.bannerImage}
              alt={event.title}
              className="w-14 h-14 rounded-lg object-cover shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 text-sm truncate">{event.title}</h4>
              <p className="text-xs text-slate-500 truncate">{event.category} • {event.venueName || 'Online'}</p>
            </div>
          </div>

          {/* Social Platforms 1-Click Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Bagikan Langsung ke Media Sosial:
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* WhatsApp */}
              <a
                href={links.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span>WhatsApp</span>
              </a>

              {/* Telegram */}
              <a
                href={links.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl border border-sky-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
              >
                <div className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xs">
                  <Send className="w-4 h-4 -rotate-12" />
                </div>
                <span>Telegram</span>
              </a>

              {/* Twitter/X */}
              <a
                href={links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl border border-slate-300 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <span className="font-extrabold text-xs">𝕏</span>
                </div>
                <span>X / Twitter</span>
              </a>

              {/* Facebook */}
              <a
                href={links.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl border border-blue-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <span className="font-bold text-xs">f</span>
                </div>
                <span>Facebook</span>
              </a>

              {/* LinkedIn */}
              <a
                href={links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-xl border border-indigo-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <span className="font-bold text-xs">in</span>
                </div>
                <span>LinkedIn</span>
              </a>

              {/* Email */}
              <a
                href={links.email}
                className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl border border-amber-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
              >
                <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <Globe className="w-4 h-4" />
                </div>
                <span>Email Blast</span>
              </a>
            </div>
          </div>

          {/* Quick Registration with Google Link */}
          <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Link Pendaftaran Cepat via Google (OAuth):
              </span>
              <span className="text-[10px] bg-blue-200/80 text-blue-800 font-bold px-1.5 py-0.5 rounded-sm">
                Rekomendasi Kreator
              </span>
            </div>
            <p className="text-[11px] text-blue-700 leading-snug">
              Peserta yang membuka tautan ini langsung diarahkan ke form pendaftaran dengan profil akun Google otomatis terisi.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={links.googleRegisterUrl}
                className="flex-1 bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono select-all truncate"
              />
              <button
                onClick={() => handleCopy('google', links.googleRegisterUrl)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 transition-colors shadow-xs"
              >
                {copiedLink === 'google' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink === 'google' ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          {/* Direct URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Link Halaman Event Langsung (URL Publik):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={links.directUrl}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-mono select-all truncate"
              />
              <button
                onClick={() => handleCopy('direct', links.directUrl)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 transition-colors shadow-xs"
              >
                {copiedLink === 'direct' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink === 'direct' ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          {/* QR Code Graphic for Flyer / Poster */}
          {qrDataUrl && (
            <div className="pt-2 flex flex-col items-center justify-center p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-center">
              <span className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-slate-600" />
                QR Code untuk Poster / Banner Cetak:
              </span>
              <img src={qrDataUrl} alt="QR Code Pendaftaran" className="w-36 h-36 rounded-lg shadow-xs bg-white p-1" />
              <p className="text-[11px] text-slate-500 mt-1">
                Scan menggunakan kamera HP untuk langsung membuka formulir tiket event
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
