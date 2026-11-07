import React from 'react';
import { Calendar, MapPin, Video, Users, Tag, ArrowRight, Share2, Sparkles } from 'lucide-react';
import { EventItem } from '../types';
import { formatRupiah } from '../utils/ticketing-logic';

interface EventCardProps {
  event: EventItem;
  onSelectEvent: (event: EventItem) => void;
  onQuickShare: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onSelectEvent,
  onQuickShare,
}) => {
  // Compute lowest price and remaining quota
  const lowestPrice = event.tickets.length > 0
    ? Math.min(...event.tickets.map(t => t.price))
    : 0;

  const totalQuota = event.tickets.reduce((acc, t) => acc + t.quota, 0);
  const totalSold = event.tickets.reduce((acc, t) => acc + (t.soldCount || 0), 0);
  const percentageSold = totalQuota > 0 ? Math.min(100, Math.round((totalSold / totalQuota) * 100)) : 0;

  const formattedDate = new Date(event.startDate).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col overflow-hidden group">
      {/* Banner Image Container */}
      <div className="relative aspect-16/9 w-full overflow-hidden bg-slate-100">
        <img
          src={event.bannerImage}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Category Pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900/80 backdrop-blur-md text-white shadow-xs">
            {event.category}
          </span>
          {event.isFeatured && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow-xs">
              <Sparkles className="w-3 h-3" />
              Unggulan
            </span>
          )}
        </div>

        {/* Quick Share Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickShare(event);
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-blue-600 shadow-md backdrop-blur-xs transition-colors cursor-pointer"
          title="Bagikan Event ke Media Sosial"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Date Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md font-medium">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px]">
            {event.locationType === 'online' ? (
              <>
                <Video className="w-3 h-3 text-emerald-400" />
                <span>Webinar Online</span>
              </>
            ) : (
              <>
                <MapPin className="w-3 h-3 text-red-400" />
                <span className="truncate max-w-[120px]">{event.venueName || 'Venue'}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Creator Info */}
          <div className="flex items-center gap-2 mb-2">
            <img
              src={event.creatorAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80'}
              alt={event.creatorName || 'Kreator'}
              className="w-5 h-5 rounded-full object-cover"
            />
            <span className="text-xs text-slate-500 font-medium truncate">
              {event.creatorName || 'Kreator Event'}
            </span>
          </div>

          {/* Title */}
          <h3 
            onClick={() => onSelectEvent(event)}
            className="font-bold text-slate-900 text-base leading-snug line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors"
          >
            {event.title}
          </h3>

          {/* Description snippet */}
          <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
            {event.shortDescription}
          </p>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3">
          {/* Quota Progress */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
              <span className="flex items-center gap-1 font-medium">
                <Users className="w-3 h-3 text-slate-400" />
                {totalSold} Terdaftar
              </span>
              <span className="font-semibold text-slate-700">
                {percentageSold >= 90 ? (
                  <span className="text-amber-600 font-bold">Hampir Habis!</span>
                ) : (
                  `Sisa ${Math.max(0, totalQuota - totalSold)} tiket`
                )}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentageSold >= 90 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${percentageSold}%` }}
              />
            </div>
          </div>

          {/* Price and CTA */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                Mulai Dari
              </span>
              <span className="font-extrabold text-blue-700 text-base">
                {formatRupiah(lowestPrice)}
              </span>
            </div>

            <button
              onClick={() => onSelectEvent(event)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer group-hover:shadow-md"
            >
              <span>Beli Tiket</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
