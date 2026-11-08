import React, { useState, useMemo } from 'react';
import { 
  Newspaper, 
  Search, 
  Sparkles, 
  Calendar, 
  Clock, 
  Eye, 
  ArrowRight, 
  MapPin, 
  Tag, 
  Filter,
  Flame,
  Music,
  Trophy,
  Activity,
  Compass,
  LayoutGrid
} from 'lucide-react';
import { EventNews, NewsCategory } from '../types';

interface NewsSectionProps {
  newsList: EventNews[];
  onSelectNews: (news: EventNews) => void;
  onBrowseEvents?: () => void;
}

export const NewsSection: React.FC<NewsSectionProps> = ({
  newsList,
  onSelectNews,
  onBrowseEvents,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: { label: string; icon: React.ReactNode }[] = [
    { label: 'Semua', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { label: 'Event Musik & Konser', icon: <Music className="w-3.5 h-3.5" /> },
    { label: 'Event Olahraga', icon: <Trophy className="w-3.5 h-3.5" /> },
    { label: 'Running & Marathon', icon: <Activity className="w-3.5 h-3.5" /> },
    { label: 'Festival Budaya & Wisata', icon: <Compass className="w-3.5 h-3.5" /> },
    { label: 'Pameran & Konferensi', icon: <Newspaper className="w-3.5 h-3.5" /> },
  ];

  const filteredNews = useMemo(() => {
    return newsList.filter((item) => {
      const matchesCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchesSearch = !searchQuery || (
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
      );
      const isPublished = item.status === 'published';
      return matchesCategory && matchesSearch && isPublished;
    });
  }, [newsList, selectedCategory, searchQuery]);

  const featuredNews = useMemo(() => {
    return newsList.find(n => n.isFeatured && n.status === 'published') || newsList[0];
  }, [newsList]);

  const getCategoryColor = (category: string) => {
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
    <section className="py-8 sm:py-12 space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-bold mb-2">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Kabar & Informasi Event Terkini</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Berita Event & Hiburan Indonesia
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Informasi resmi kalender konser musik, agenda lari marathon, kejuaraan olahraga, dan festival budaya yang dikurasi oleh Super Admin Pusat Celebes Event.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berita konser, lari, artis..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Category Pill Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => setSelectedCategory(cat.label)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              selectedCategory === cat.label
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Featured Headline Banner (if any) */}
      {featuredNews && selectedCategory === 'Semua' && !searchQuery && (
        <div 
          onClick={() => onSelectNews(featuredNews)}
          className="group relative rounded-3xl overflow-hidden bg-slate-900 text-white shadow-xl cursor-pointer hover:shadow-2xl transition-all duration-300 border border-slate-800"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Image side */}
            <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-96 overflow-hidden">
              <img
                src={featuredNews.imageUrl}
                alt={featuredNews.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent" />
              
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-500 text-white text-[11px] font-extrabold uppercase rounded-full shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Sorotan Utama</span>
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md ${getCategoryColor(featuredNews.category)}`}>
                  {featuredNews.category}
                </span>
              </div>
            </div>

            {/* Content side */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-b from-slate-900 to-slate-950">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    {new Date(featuredNews.publishedAt || featuredNews.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {featuredNews.readTime}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-blue-400 transition-colors leading-snug">
                  {featuredNews.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed">
                  {featuredNews.summary}
                </p>

                {featuredNews.eventLocation && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{featuredNews.eventLocation}</span>
                  </div>
                )}
              </div>

              <div className="pt-6 flex items-center justify-between border-t border-slate-800/80">
                <span className="text-xs font-bold text-blue-400 group-hover:underline flex items-center gap-1.5">
                  <span>Baca Selengkapnya</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {featuredNews.viewsCount.toLocaleString('id-ID')} views
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* News Cards Grid */}
      {filteredNews.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((item) => (
            <article
              key={item.id}
              onClick={() => onSelectNews(item)}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md shadow-2xs ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(item.publishedAt || item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.readTime}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug text-base">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                {/* Footer metadata */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                    <span>Baca Berita</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {item.viewsCount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <Newspaper className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Tidak Ada Berita Ditemukan</h3>
          <p className="text-xs text-slate-500">
            Tidak ada artikel berita yang cocok dengan filter atau kata kunci "{searchQuery}".
          </p>
          <button
            onClick={() => {
              setSelectedCategory('Semua');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Tampilkan Semua Berita
          </button>
        </div>
      )}
    </section>
  );
};
