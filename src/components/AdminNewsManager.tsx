import React, { useState, useEffect } from 'react';
import { 
  Newspaper, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Calendar, 
  MapPin, 
  Sparkles, 
  Clock, 
  Tag, 
  Upload, 
  Check, 
  Filter 
} from 'lucide-react';
import { EventNews, NewsCategory } from '../types';
import { api } from '../services/api';

interface AdminNewsManagerProps {
  onRefreshData?: () => void;
}

const CATEGORIES: NewsCategory[] = [
  'Event Musik & Konser',
  'Event Olahraga',
  'Running & Marathon',
  'Festival Budaya & Wisata',
  'Pameran & Konferensi',
  'Informasi & Tips Event',
];

export const AdminNewsManager: React.FC<AdminNewsManagerProps> = ({ onRefreshData }) => {
  const [newsList, setNewsList] = useState<EventNews[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<EventNews | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Event Musik & Konser' as NewsCategory,
    summary: '',
    content: '',
    imageUrl: '',
    author: 'Redaksi Celebes Event',
    authorRole: 'Redaksi Berita & Liputan Event',
    eventDate: '',
    eventLocation: '',
    readTime: '3 menit baca',
    isFeatured: false,
    status: 'published' as 'published' | 'draft',
    tagsInput: '',
  });

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const data = await api.getNews(undefined, true);
      setNewsList(data);
    } catch (err: any) {
      console.warn('Gagal memuat berita:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenCreateForm = () => {
    setEditingNews(null);
    setFormData({
      title: '',
      category: 'Event Musik & Konser',
      summary: '',
      content: '',
      imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
      author: 'Super Admin Bergulir Media',
      authorRole: 'Redaksi Berita & Liputan Event',
      eventDate: '',
      eventLocation: '',
      readTime: '3 menit baca',
      isFeatured: false,
      status: 'published',
      tagsInput: 'Event, Info, Indonesia',
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: EventNews) => {
    setEditingNews(item);
    setFormData({
      title: item.title,
      category: item.category,
      summary: item.summary,
      content: item.content,
      imageUrl: item.imageUrl,
      author: item.author,
      authorRole: item.authorRole || 'Redaksi Berita & Liputan Event',
      eventDate: item.eventDate || '',
      eventLocation: item.eventLocation || '',
      readTime: item.readTime,
      isFeatured: item.isFeatured,
      status: item.status,
      tagsInput: item.tags ? item.tags.join(', ') : '',
    });
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Judul dan isi berita wajib diisi!');
      return;
    }

    const tagsArray = formData.tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    try {
      if (editingNews) {
        await api.updateNews(editingNews.id, {
          ...formData,
          tags: tagsArray,
        });
        showToast(`Berita "${formData.title}" berhasil diperbarui!`);
      } else {
        await api.createNews({
          ...formData,
          tags: tagsArray,
        });
        showToast(`Berita baru berhasil diterbitkan!`);
      }

      setIsFormOpen(false);
      fetchNews();
      onRefreshData?.();
    } catch (err: any) {
      alert('Gagal menyimpan berita: ' + err.message);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Yakin ingin menghapus berita "${title}"?`)) return;
    try {
      await api.deleteNews(id);
      showToast(`Berita "${title}" telah dihapus.`);
      fetchNews();
      onRefreshData?.();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const handleToggleStatus = async (item: EventNews) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      await api.updateNews(item.id, { status: newStatus });
      showToast(`Status berita diubah menjadi ${newStatus}.`);
      fetchNews();
    } catch (err: any) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  const filtered = newsList.filter(n => {
    const matchCat = selectedFilter === 'Semua' || n.category === selectedFilter;
    const matchSearch = !searchQuery || (
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.author.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Newspaper className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Manajemen Berita & Liputan Event</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Publikasikan artikel, kabar konser musik, event lari/marathon, dan agenda pariwisata nasional.
          </p>
        </div>

        <button
          onClick={handleOpenCreateForm}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Berita Baru</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedFilter('Semua')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              selectedFilter === 'Semua'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Semua ({newsList.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                selectedFilter === cat
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berita..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
          />
        </div>
      </div>

      {/* Table List of News */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Artikel Berita</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Penulis & Tanggal</th>
                <th className="py-3.5 px-4 text-center">Dibaca</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 max-w-sm">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-14 h-11 object-cover rounded-xl shrink-0 border border-slate-200"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {item.isFeatured && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500 text-white shrink-0">
                              Utama
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{item.summary}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold">
                      {item.category}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{item.author}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(item.publishedAt || item.createdAt).toLocaleDateString('id-ID')}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="font-mono font-bold text-slate-700 flex items-center justify-center gap-1">
                      <Eye className="w-3 h-3 text-slate-400" />
                      {item.viewsCount}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        item.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                    >
                      {item.status === 'published' ? 'Tayang (Published)' : 'Draf (Draft)'}
                    </button>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEditForm(item)}
                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Berita"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Berita"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Belum ada artikel berita yang cocok. Klik "Tambah Berita Baru" untuk menerbitkan liputan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit News Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 animate-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-purple-600" />
                <span>{editingNews ? 'Edit Berita Event' : 'Terbitkan Berita Event Baru'}</span>
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Berita</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Konser Akbar Sheila on 7 Siap Ramaikan Makassar..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Event</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as NewsCategory })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Publikasi</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'published' | 'draft' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    <option value="published">Tayang Sekarang (Published)</option>
                    <option value="draft">Simpan Draf (Draft)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL Gambar Banner Berita</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jadwal / Waktu Event</label>
                  <input
                    type="text"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    placeholder="Contoh: 15 - 18 Agustus 2026"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lokasi Penyelenggaraan</label>
                  <input
                    type="text"
                    value={formData.eventLocation}
                    onChange={(e) => setFormData({ ...formData, eventLocation: e.target.value })}
                    placeholder="Contoh: Pantai Losari Makassar"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ringkasan Singkat (Lead)</label>
                <textarea
                  rows={2}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Ringkasan 1-2 kalimat untuk kartu depan..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Isi Berita Lengkap</label>
                <textarea
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Tulis artikel berita lengkap di sini..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Penulis / Redaksi</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tag (Pisahkan dengan koma)</label>
                  <input
                    type="text"
                    value={formData.tagsInput}
                    onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
                    placeholder="Konser, Lari, Makassar, Tiket"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isFeaturedNews"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded-md cursor-pointer"
                />
                <label htmlFor="isFeaturedNews" className="font-bold text-slate-800 cursor-pointer">
                  Tandai sebagai Berita Sorotan Utama (Headline Banner)
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {editingNews ? 'Simpan Perubahan' : 'Terbitkan Berita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
