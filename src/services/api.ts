import { EventItem, Order, PayoutRequest, Ticket, Voucher, DatabaseStatus, User, PlatformSettings, SupportTicket, FaqItem, SentEmailNotification, NationalEventLink, EventNews } from '../types';
import { DEFAULT_PLATFORM_SETTINGS, INITIAL_NATIONAL_EVENTS, INITIAL_EVENT_NEWS } from '../data/seedData';

export const api = {
  // Database status
  async getDbStatus(): Promise<DatabaseStatus> {
    try {
      const res = await fetch('/api/db-status');
      if (!res.ok) throw new Error('Failed to fetch DB status');
      return await res.json();
    } catch {
      return {
        isConfigured: false,
        mode: 'memory-resilient',
        host: 'localhost (Local Mode)',
        database: 'celebes_event_db',
        user: 'root',
        connected: false,
        latencyMs: 0,
        tableCounts: { users: 3, events: 3, orders: 2, vouchers: 3, payouts: 1 },
        message: 'Menggunakan state lokal berkinerja tinggi. Siap dihubungkan ke MySQL.',
      };
    }
  },

  // Test custom MySQL connection
  async testMysqlConnection(payload: any): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/test-mysql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  // Events
  async getEvents(params?: { category?: string; search?: string; status?: string; creatorId?: string }): Promise<EventItem[]> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.creatorId) query.set('creatorId', params.creatorId);

    const res = await fetch(`/api/events?${query.toString()}`);
    if (!res.ok) throw new Error('Gagal mengambil data event');
    return await res.json();
  },

  async getEvent(idOrSlug: string): Promise<EventItem> {
    const res = await fetch(`/api/events/${encodeURIComponent(idOrSlug)}`);
    if (!res.ok) throw new Error('Event tidak ditemukan');
    return await res.json();
  },

  async createEvent(eventData: Partial<EventItem>): Promise<EventItem> {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    if (!res.ok) throw new Error('Gagal membuat event');
    return await res.json();
  },

  async updateEvent(id: string, eventData: Partial<EventItem>): Promise<EventItem> {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    if (!res.ok) throw new Error('Gagal memperbarui event');
    return await res.json();
  },

  async deleteEvent(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Gagal menghapus event');
    return await res.json();
  },

  // Orders & Registration
  async getOrders(params?: { userId?: string; eventId?: string }): Promise<Order[]> {
    const query = new URLSearchParams();
    if (params?.userId) query.set('userId', params.userId);
    if (params?.eventId) query.set('eventId', params.eventId);

    const res = await fetch(`/api/orders?${query.toString()}`);
    if (!res.ok) throw new Error('Gagal mengambil daftar pesanan');
    return await res.json();
  },

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!res.ok) throw new Error('Gagal membuat pesanan');
    return await res.json();
  },

  async payOrder(id: string, paymentReference?: string): Promise<{ success: boolean; order: Order }> {
    const res = await fetch(`/api/orders/${id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentReference }),
    });
    if (!res.ok) throw new Error('Gagal memproses pembayaran');
    return await res.json();
  },

  async verifyPaymentOrder(
    id: string,
    status: 'paid' | 'payment_rejected',
    rejectionReason?: string,
    verifiedBy?: string
  ): Promise<{ success: boolean; order: Order; message: string }> {
    const res = await fetch(`/api/orders/${id}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason, verifiedBy }),
    });
    if (!res.ok) throw new Error('Gagal memverifikasi pembayaran');
    return await res.json();
  },

  async deleteOrder(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Gagal menghapus transaksi order');
    return data;
  },

  async createAdminManualOrder(orderData: any): Promise<{ success: boolean; order: Order; message: string }> {
    const res = await fetch('/api/admin/manual-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Gagal membuat transaksi manual oleh Super Admin');
    return data;
  },

  // Midtrans Payment Gateway API
  async testMidtransConnection(payload: { serverKey?: string; isSandbox?: boolean }): Promise<{ success: boolean; message: string; environment?: string; details?: any }> {
    const res = await fetch('/api/midtrans/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async createMidtransSnapTransaction(payload: any): Promise<{ success: boolean; token?: string; redirectUrl?: string; mode: string; message?: string }> {
    const res = await fetch('/api/midtrans/create-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async checkMidtransStatus(orderNumber: string): Promise<{ isPaid: boolean; status: string; message: string; order?: Order; details?: any }> {
    const res = await fetch(`/api/midtrans/status/${encodeURIComponent(orderNumber)}`);
    return await res.json();
  },

  // Tickets & Check-in
  async getTicket(code: string): Promise<{ ticket: Ticket; order: Order }> {
    const res = await fetch(`/api/tickets/${encodeURIComponent(code)}`);
    if (!res.ok) throw new Error('Tiket tidak ditemukan');
    return await res.json();
  },

  async checkInTicket(code: string, eventId?: string): Promise<{ success: boolean; message: string; ticket?: Ticket; order?: Order }> {
    const res = await fetch('/api/tickets/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, eventId }),
    });
    return await res.json();
  },

  // Vouchers
  async validateVoucher(code: string, eventId?: string): Promise<{ valid: boolean; message?: string; voucher?: Voucher }> {
    const res = await fetch('/api/vouchers/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, eventId }),
    });
    return await res.json();
  },

  // Payouts
  async getPayouts(creatorId?: string): Promise<PayoutRequest[]> {
    const query = new URLSearchParams();
    if (creatorId) query.set('creatorId', creatorId);
    const res = await fetch(`/api/payouts?${query.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat daftar pencairan');
    return await res.json();
  },

  async createPayout(payoutData: Partial<PayoutRequest>): Promise<PayoutRequest> {
    const res = await fetch('/api/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payoutData),
    });
    if (!res.ok) throw new Error('Gagal mengajukan penarikan');
    return await res.json();
  },

  async updatePayoutStatus(id: string, status: 'approved' | 'rejected', adminNote?: string): Promise<PayoutRequest> {
    const res = await fetch(`/api/payouts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNote }),
    });
    if (!res.ok) throw new Error('Gagal mengupdate status pencairan');
    return await res.json();
  },

  async deletePayout(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/payouts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Gagal menghapus data pencairan dana');
    return data;
  },

  // Users & Authentication
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Gagal memuat pengguna');
    return await res.json();
  },

  async registerCreator(payload: Partial<User>): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch('/api/auth/register-creator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Gagal mendaftar kreator');
    return data;
  },

  async registerUser(payload: Partial<User>): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch('/api/auth/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Gagal mendaftar');
    return data;
  },

  async login(email: string, password?: string): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Gagal masuk');
    return data;
  },

  async updateUserStatus(id: string, status: string): Promise<{ success: boolean; user: User; message: string; email?: SentEmailNotification }> {
    const res = await fetch(`/api/users/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  },

  async approveCreator(id: string): Promise<{ success: boolean; user: User; email?: SentEmailNotification; message: string }> {
    const res = await fetch(`/api/users/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  },

  async getSentEmails(): Promise<SentEmailNotification[]> {
    try {
      const res = await fetch('/api/admin/sent-emails');
      if (!res.ok) throw new Error('Gagal memuat log email');
      return await res.json();
    } catch {
      return [];
    }
  },

  async resendApprovalEmail(userId: string): Promise<{ success: boolean; email?: SentEmailNotification; message: string }> {
    const res = await fetch('/api/admin/resend-approval-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  },

  async deleteUser(id: string): Promise<{ success: boolean; message: string; userId?: string }> {
    const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || data.message || 'Gagal menghapus pengguna');
    return data;
  },

  // Platform Settings & Branding
  async getSettings(): Promise<PlatformSettings> {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return await res.json();
    } catch {
      return DEFAULT_PLATFORM_SETTINGS;
    }
  },

  async updateSettings(settings: Partial<PlatformSettings>): Promise<{ success: boolean; settings: PlatformSettings; message: string }> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Gagal menyimpan pengaturan platform');
    return await res.json();
  },

  // Pusat Bantuan & Support Tickets
  async getSupportTickets(params?: { status?: string; email?: string }): Promise<SupportTicket[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.email) query.set('email', params.email);
    const res = await fetch(`/api/support-tickets?${query.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat tiket bantuan');
    return await res.json();
  },

  async createSupportTicket(ticketData: Partial<SupportTicket>): Promise<{ success: boolean; ticket: SupportTicket; message: string }> {
    const res = await fetch('/api/support-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData),
    });
    if (!res.ok) throw new Error('Gagal mengirim laporan kendala');
    return await res.json();
  },

  async updateSupportTicket(id: string, payload: { status?: string; adminReply?: string }): Promise<{ success: boolean; ticket: SupportTicket; message: string }> {
    const res = await fetch(`/api/support-tickets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Gagal memperbarui status kendala');
    return await res.json();
  },

  async deleteSupportTicket(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/support-tickets/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Gagal menghapus tiket bantuan');
    return data;
  },

  // FAQs
  async getFaqs(): Promise<FaqItem[]> {
    try {
      const res = await fetch('/api/faqs');
      if (!res.ok) throw new Error('Failed to fetch FAQs');
      return await res.json();
    } catch {
      return [];
    }
  },

  // National Events (Info Event Indonesia yang bisa ikut dipublish kelolaan Super Admin)
  async getNationalEvents(all = false): Promise<NationalEventLink[]> {
    try {
      const res = await fetch(`/api/national-events${all ? '?all=true' : ''}`);
      if (!res.ok) throw new Error('Gagal memuat event nasional');
      const data = await res.json();
      return Array.isArray(data) ? data : INITIAL_NATIONAL_EVENTS;
    } catch {
      return INITIAL_NATIONAL_EVENTS;
    }
  },

  async createNationalEvent(data: Partial<NationalEventLink>): Promise<NationalEventLink> {
    const res = await fetch('/api/national-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Gagal menambahkan link event nasional');
    return await res.json();
  },

  async updateNationalEvent(id: string, data: Partial<NationalEventLink>): Promise<NationalEventLink> {
    const res = await fetch(`/api/national-events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Gagal memperbarui link event nasional');
    return await res.json();
  },

  async deleteNationalEvent(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/national-events/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Gagal menghapus event nasional');
    return await res.json();
  },

  async toggleNationalEvent(id: string): Promise<NationalEventLink> {
    const res = await fetch(`/api/national-events/${id}/toggle`, {
      method: 'PATCH',
    });
    if (!res.ok) throw new Error('Gagal mengubah status publikasi event nasional');
    return await res.json();
  },

  // 13. Berita & Informasi Event Indonesia (Super Admin Managed)
  async getNews(category?: string, all = false): Promise<EventNews[]> {
    try {
      const q = new URLSearchParams();
      if (category && category !== 'Semua') q.append('category', category);
      if (all) q.append('all', 'true');
      const res = await fetch(`/api/news?${q.toString()}`);
      if (!res.ok) throw new Error('Gagal mengambil daftar berita');
      return await res.json();
    } catch {
      let filtered = [...INITIAL_EVENT_NEWS];
      if (!all) filtered = filtered.filter(n => n.status === 'published');
      if (category && category !== 'Semua') filtered = filtered.filter(n => n.category === category);
      return filtered;
    }
  },

  async getNewsById(idOrSlug: string): Promise<EventNews> {
    const res = await fetch(`/api/news/${idOrSlug}`);
    if (!res.ok) throw new Error('Berita tidak ditemukan');
    return await res.json();
  },

  async createNews(data: Partial<EventNews>): Promise<EventNews> {
    const res = await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Gagal menerbitkan berita baru');
    return await res.json();
  },

  async updateNews(id: string, data: Partial<EventNews>): Promise<EventNews> {
    const res = await fetch(`/api/news/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Gagal memperbarui berita');
    return await res.json();
  },

  async deleteNews(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/news/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Gagal menghapus berita');
    return await res.json();
  },
};

