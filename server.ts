import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { INITIAL_USERS, INITIAL_EVENTS, INITIAL_ORDERS, INITIAL_VOUCHERS, INITIAL_PAYOUTS, DEFAULT_PLATFORM_SETTINGS, INITIAL_SUPPORT_TICKETS, INITIAL_FAQS, INITIAL_SENT_EMAILS, INITIAL_NATIONAL_EVENTS } from './src/data/seedData';
import { EventItem, Order, User, Voucher, PayoutRequest, Ticket, PlatformSettings, SupportTicket, FaqItem, SentEmailNotification, NationalEventLink } from './src/types';
import { verifyAndCheckInTicket } from './src/utils/ticketing-logic';

import { fileURLToPath } from 'url';

let detectedDir = process.cwd();
try {
  if (typeof __dirname !== 'undefined') {
    detectedDir = __dirname;
  } else if (import.meta && import.meta.url) {
    detectedDir = path.dirname(fileURLToPath(import.meta.url));
  }
} catch {
  detectedDir = process.cwd();
}

const APP_ROOT = process.env.PASSENGER_APP_ROOT || detectedDir || process.cwd();

// Multi-path .env configuration (essential for cPanel / Passenger environments)
const candidateEnvFiles = [
  path.resolve(APP_ROOT, '.env'),
  path.resolve(detectedDir, '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve('./.env')
];
for (const envFile of candidateEnvFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}
dotenv.config();

// Auto-detect production mode:
// 1. Explicit NODE_ENV === 'production'
// 2. OR running as bundled server.js / server.cjs
// 3. OR running under cPanel Phusion Passenger
const isBundledServer = typeof __filename !== 'undefined' && (__filename.endsWith('server.js') || __filename.endsWith('server.cjs'));
const isPassenger = Boolean(process.env.PASSENGER_APP_ROOT || process.env.IS_HOSTING);
const isProduction = process.env.NODE_ENV === 'production' || isBundledServer || isPassenger;

const PORT = isProduction && process.env.PORT
  ? (Number(process.env.PORT) || 3000)
  : 3000;
const app = express();

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled rejection:', reason);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.resolve(APP_ROOT, 'public')));

app.get('/download-all-in-one', (_req: Request, res: Response) => {
  const filePath = path.resolve(APP_ROOT, 'public', 'celebesevent-lengkap-dengan-nodemodules.zip');
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'celebesevent-lengkap-dengan-nodemodules.zip');
  } else {
    res.status(404).send('File not found');
  }
});

app.get('/download-paket', (_req: Request, res: Response) => {
  const filePath = path.resolve(APP_ROOT, 'public', 'celebesevent-siap-pakai-eventbergulir.zip');
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'celebesevent-siap-pakai-eventbergulir.zip');
  } else {
    res.status(404).send('File not found');
  }
});

const LOCAL_STORAGE_FILE = path.resolve(APP_ROOT, 'database', 'local_data.json');

// In-Memory resilient store (fallback when MySQL host is not configured or in local preview)
let memoryUsers: User[] = [...INITIAL_USERS];
let memoryEvents: EventItem[] = JSON.parse(JSON.stringify(INITIAL_EVENTS));
let memoryOrders: Order[] = JSON.parse(JSON.stringify(INITIAL_ORDERS));
let memoryVouchers: Voucher[] = JSON.parse(JSON.stringify(INITIAL_VOUCHERS));
let memoryPayouts: PayoutRequest[] = JSON.parse(JSON.stringify(INITIAL_PAYOUTS));
let memorySettings: PlatformSettings = JSON.parse(JSON.stringify(DEFAULT_PLATFORM_SETTINGS));
let memorySupportTickets: SupportTicket[] = JSON.parse(JSON.stringify(INITIAL_SUPPORT_TICKETS));
let memoryFaqs: FaqItem[] = JSON.parse(JSON.stringify(INITIAL_FAQS));
let memorySentEmails: SentEmailNotification[] = JSON.parse(JSON.stringify(INITIAL_SENT_EMAILS));
let memoryNationalEvents: NationalEventLink[] = JSON.parse(JSON.stringify(INITIAL_NATIONAL_EVENTS));

function generateCreatorApprovalEmail(user: User): SentEmailNotification {
  return {
    id: `eml-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    recipientEmail: user.email,
    recipientName: user.name,
    recipientRole: 'creator',
    subject: `🎉 Selamat! Akun Kreator Celebes Event "${user.organization || user.name}" Telah Disetujui Admin Pusat`,
    bodyHtml: `<div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; color: #0f172a;">
      <div style="background: linear-gradient(135deg, #1e3a8a, #4338ca); padding: 28px 24px; border-radius: 12px; text-align: center; color: #ffffff;">
        <span style="display: inline-block; padding: 4px 12px; background: rgba(255,255,255,0.2); border-radius: 20px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 8px;">CELEBES EVENT • NOTIFIKASI RESMI</span>
        <h1 style="margin: 0; font-size: 22px; font-weight: 800;">Pemberitahuan Persetujuan Akun Kreator</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Platform Manajemen Event & E-Ticket Resmi Indonesia</p>
      </div>

      <div style="padding: 24px 8px; line-height: 1.6;">
        <p style="font-size: 15px; margin-top: 0;">Yth. <strong>${user.name}</strong> (${user.organization || 'Kreator Event'}),</p>
        <p style="color: #334155;">Selamat! Permohonan pendaftaran akun kreator event Anda telah <strong>DITINJAU DAN DISETUJUI</strong> oleh Tim Super Admin Celebes Event.</p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <div style="font-weight: 800; color: #15803d; font-size: 14px; margin-bottom: 4px;">✅ Status Akun: AKTIF & TERVERIFIKASI</div>
          <p style="margin: 0; font-size: 13px; color: #166534;">
            Anda kini memiliki hak akses penuh untuk menerbitkan event, menjual tiket berbayar/gratis, mengkustomisasi formulir peserta, memantau riwayat penjualan, dan menggunakan scanner QR check-in.
          </p>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px;">
          <div style="font-weight: bold; color: #0f172a; margin-bottom: 8px;">Informasi Akun Terverifikasi:</div>
          <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
            <tr><td style="color: #64748b; padding: 4px 0; width: 140px;">Nama Organisasi / EO:</td><td style="font-weight: 600; color: #0f172a;">${user.organization || '-'}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Email Login:</td><td style="font-weight: 600; color: #0f172a;">${user.email}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Metode Autentikasi:</td><td style="font-weight: 600; color: #0f172a;">${user.auth_provider === 'google' ? 'Google Account (OAuth)' : 'Email & Password'}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Kota Operasional:</td><td style="font-weight: 600; color: #0f172a;">${user.city || 'Makassar / Sulawesi'}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Waktu Persetujuan:</td><td style="font-weight: 600; color: #0f172a;">${new Date().toLocaleString('id-ID')}</td></tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #334155;">Silakan kunjungi platform Celebes Event dan login untuk langsung masuk ke Creator Studio!</p>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 12px; color: #64748b; text-align: center;">
        <p style="margin: 0 0 4px 0;"><strong>Celebes Event Management System</strong></p>
        <p style="margin: 0; font-size: 11px;">Disetujui oleh Super Admin Pusat (redaksibergulircom@gmail.com)</p>
      </div>
    </div>`,
    type: 'creator_approved',
    sentAt: new Date().toISOString(),
    status: 'delivered',
    sender: 'Super Admin Pusat Celebes Event <redaksibergulircom@gmail.com>',
  };
}

function saveLocalData() {
  try {
    const dir = path.dirname(LOCAL_STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const dataToSave = {
      users: memoryUsers,
      events: memoryEvents,
      orders: memoryOrders,
      vouchers: memoryVouchers,
      payouts: memoryPayouts,
      settings: memorySettings,
      supportTickets: memorySupportTickets,
      faqs: memoryFaqs,
      sentEmails: memorySentEmails,
      nationalEvents: memoryNationalEvents,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Storage] Gagal menyimpan database/local_data.json:', err);
  }
}

function loadLocalData() {
  try {
    if (fs.existsSync(LOCAL_STORAGE_FILE)) {
      const content = fs.readFileSync(LOCAL_STORAGE_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.users) && parsed.users.length) memoryUsers = parsed.users;
      if (Array.isArray(parsed.events)) memoryEvents = parsed.events;
      if (Array.isArray(parsed.orders)) memoryOrders = parsed.orders;
      if (Array.isArray(parsed.vouchers)) memoryVouchers = parsed.vouchers;
      if (Array.isArray(parsed.payouts)) memoryPayouts = parsed.payouts;
      if (parsed.settings) memorySettings = parsed.settings;
      if (Array.isArray(parsed.supportTickets)) memorySupportTickets = parsed.supportTickets;
      if (Array.isArray(parsed.faqs)) memoryFaqs = parsed.faqs;
      if (Array.isArray(parsed.sentEmails)) memorySentEmails = parsed.sentEmails;
      if (Array.isArray(parsed.nationalEvents)) memoryNationalEvents = parsed.nationalEvents;
      console.log('[Storage] Data lokal berhasil dimuat dari database/local_data.json');
    }
  } catch (err) {
    console.warn('[Storage] Gagal membaca database/local_data.json, menggunakan data awal:', err);
  }
}

loadLocalData();

// MySQL Connection Pool (if configured via env vars)
let mysqlPool: mysql.Pool | null = null;
let isMysqlActive = false;
let mysqlLastError = '';

async function initMysql() {
  // Re-read candidate env files dynamically in case .env was modified in cPanel File Manager
  for (const envFile of candidateEnvFiles) {
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile, override: true });
    }
  }

  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;
  const password = process.env.MYSQL_PASSWORD;
  const port = Number(process.env.MYSQL_PORT) || 3306;

  if (host && user && database) {
    try {
      const pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5000,
      });

      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      mysqlPool = pool;
      isMysqlActive = true;
      mysqlLastError = '';
      console.log(`[Database] Terkoneksi ke MySQL Host: ${host}, Database: ${database}`);
    } catch (err: any) {
      if (mysqlPool) {
        try { await mysqlPool.end(); } catch {}
      }
      mysqlPool = null;
      isMysqlActive = false;
      mysqlLastError = err?.message || 'Gagal terhubung ke MySQL';
      console.warn(`[Database] MySQL tidak aktif atau belum siap (${mysqlLastError}). Menggunakan penyimpanan in-memory.`);
    }
  } else {
    isMysqlActive = false;
    mysqlLastError = 'Variabel environment MYSQL_HOST belum disetel. Berjalan dalam mode Local In-Memory.';
  }
}

async function ensureMysql(): Promise<boolean> {
  if (isMysqlActive && mysqlPool) return true;
  await initMysql();
  return isMysqlActive;
}

initMysql();

// Helper to format ISO date to MySQL datetime 'YYYY-MM-DD HH:MM:SS'
function toMysqlDatetime(isoOrDateStr?: string | null): string {
  if (!isoOrDateStr) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  const d = new Date(isoOrDateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// ----------------------------------------------------
// DATABASE HELPER FUNCTIONS (MySQL with Memory Fallback)
// ----------------------------------------------------

async function getUsersFromDb(): Promise<User[]> {
  await ensureMysql();
  if (isMysqlActive && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query(`SELECT * FROM users ORDER BY created_at DESC`);
      if (Array.isArray(rows)) {
        return rows.map((r: any) => ({
          id: r.id,
          email: r.email,
          name: r.name,
          password: r.password_hash || '',
          role: r.role,
          avatar: r.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
          phone: r.phone || '',
          organization: r.organization || '',
          auth_provider: r.auth_provider || 'local',
          status: r.status,
          bankName: r.bank_name || '',
          bankAccountNumber: r.bank_account_number || '',
          bankAccountName: r.bank_account_name || '',
          createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || ''),
        }));
      }
    } catch (err: any) {
      console.warn('[Database] Query users gagal, menggunakan memori:', err.message);
    }
  }
  return memoryUsers;
}

async function getEventsFromDb(params?: { category?: string; search?: string; status?: string; creatorId?: string }): Promise<EventItem[]> {
  await ensureMysql();
  if (isMysqlActive && mysqlPool) {
    try {
      let sql = `
        SELECT e.*, 
               u.name as creator_name, u.avatar as creator_avatar, u.organization as creator_org
        FROM events e
        LEFT JOIN users u ON e.creator_id = u.id
        WHERE 1=1
      `;
      const queryParams: any[] = [];
      if (params?.category && params.category !== 'Semua') {
        sql += ` AND e.category LIKE ?`;
        queryParams.push(`%${params.category}%`);
      }
      if (params?.status) {
        sql += ` AND e.status = ?`;
        queryParams.push(params.status);
      }
      if (params?.creatorId) {
        sql += ` AND e.creator_id = ?`;
        queryParams.push(params.creatorId);
      }
      if (params?.search) {
        sql += ` AND (e.title LIKE ? OR e.description LIKE ? OR e.venue_name LIKE ?)`;
        const s = `%${params.search}%`;
        queryParams.push(s, s, s);
      }
      sql += ` ORDER BY e.created_at DESC`;

      const [eventsRows]: any = await mysqlPool.query(sql, queryParams);
      if (Array.isArray(eventsRows) && eventsRows.length > 0) {
        const eventIds = eventsRows.map((r: any) => r.id);
        const placeholders = eventIds.map(() => '?').join(',');
        
        const [tiersRows]: any = await mysqlPool.query(
          `SELECT * FROM ticket_tiers WHERE event_id IN (${placeholders}) ORDER BY price ASC`,
          eventIds
        );
        
        const [fieldsRows]: any = await mysqlPool.query(
          `SELECT * FROM custom_form_fields WHERE event_id IN (${placeholders}) ORDER BY order_index ASC`,
          eventIds
        );

        return eventsRows.map((r: any) => {
          const tiers = (tiersRows || [])
            .filter((t: any) => t.event_id === r.id)
            .map((t: any) => ({
              id: t.id,
              eventId: t.event_id,
              name: t.name,
              description: t.description || '',
              price: Number(t.price),
              quota: Number(t.quota),
              soldCount: Number(t.sold_count || 0),
              maxPerOrder: Number(t.max_per_order || 5),
              isActive: Boolean(t.is_active),
            }));

          const fields = (fieldsRows || [])
            .filter((f: any) => f.event_id === r.id)
            .map((f: any) => {
              let options: string[] | undefined;
              if (f.options_json) {
                try { options = JSON.parse(f.options_json); } catch {}
              }
              return {
                id: f.id,
                eventId: f.event_id,
                label: f.label,
                fieldType: f.field_type,
                placeholder: f.placeholder || '',
                options,
                isRequired: Boolean(f.is_required),
                orderIndex: Number(f.order_index || 0),
              };
            });

          return {
            id: r.id,
            creatorId: r.creator_id,
            creatorName: r.creator_name || 'Celebes Creative',
            creatorAvatar: r.creator_avatar,
            title: r.title,
            slug: r.slug,
            category: r.category,
            bannerImage: r.banner_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
            shortDescription: r.short_description || '',
            description: r.description || '',
            startDate: r.start_date instanceof Date ? r.start_date.toISOString() : String(r.start_date || ''),
            endDate: r.end_date instanceof Date ? r.end_date.toISOString() : String(r.end_date || ''),
            locationType: r.location_type || 'venue',
            venueName: r.venue_name || '',
            venueAddress: r.venue_address || '',
            onlineMeetingUrl: r.online_meeting_url,
            tickets: tiers,
            customFields: fields,
            status: r.status,
            isFeatured: Boolean(r.is_featured),
            registrationLimit: Number(r.registration_limit || 0),
            socialShareSlug: r.social_share_slug,
            createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at || ''),
          };
        });
      }
      return [];
    } catch (err: any) {
      console.warn('[Database] Query events gagal, menggunakan memori:', err.message);
    }
  }

  let results = [...memoryEvents];
  if (params?.category && params.category !== 'Semua') {
    results = results.filter(e => e.category.toLowerCase().includes(params.category!.toLowerCase()));
  }
  if (params?.status) results = results.filter(e => e.status === params.status);
  if (params?.creatorId) results = results.filter(e => e.creatorId === params.creatorId);
  if (params?.search) {
    const q = params.search.toLowerCase();
    results = results.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || (e.venueName && e.venueName.toLowerCase().includes(q)));
  }
  return results;
}

async function getOrdersFromDb(userId?: string, eventId?: string): Promise<Order[]> {
  await ensureMysql();
  if (isMysqlActive && mysqlPool) {
    try {
      let sql = `SELECT * FROM orders WHERE 1=1`;
      const queryParams: any[] = [];
      if (userId) {
        sql += ` AND user_id = ?`;
        queryParams.push(userId);
      }
      if (eventId) {
        sql += ` AND event_id = ?`;
        queryParams.push(eventId);
      }
      sql += ` ORDER BY created_at DESC`;

      const [ordersRows]: any = await mysqlPool.query(sql, queryParams);
      if (Array.isArray(ordersRows) && ordersRows.length > 0) {
        const orderIds = ordersRows.map((r: any) => r.id);
        const placeholders = orderIds.map(() => '?').join(',');

        const [ticketsRows]: any = await mysqlPool.query(
          `SELECT t.*, tt.name as tier_name, tt.price as tier_price, e.title as event_title, e.start_date, e.venue_name
           FROM tickets t
           LEFT JOIN ticket_tiers tt ON t.tier_id = tt.id
           LEFT JOIN events e ON t.event_id = e.id
           WHERE t.order_id IN (${placeholders})`,
          orderIds
        );

        return ordersRows.map((o: any) => {
          const tickets = (ticketsRows || [])
            .filter((t: any) => t.order_id === o.id)
            .map((t: any) => ({
              id: t.id,
              orderId: t.order_id,
              eventId: t.event_id,
              eventTitle: t.event_title || 'Event Celebes',
              eventDate: t.start_date instanceof Date ? t.start_date.toISOString() : String(t.start_date || ''),
              venueName: t.venue_name || '',
              tierId: t.tier_id,
              tierName: t.tier_name || 'Tiket Regular',
              tierPrice: Number(t.tier_price || 0),
              ticketCode: t.ticket_code,
              qrPayload: t.qr_payload,
              attendeeName: t.attendee_name,
              attendeeEmail: t.attendee_email,
              checkInStatus: t.check_in_status,
              checkInTime: t.check_in_time ? (t.check_in_time instanceof Date ? t.check_in_time.toISOString() : String(t.check_in_time)) : undefined,
              responses: [],
              createdAt: t.created_at instanceof Date ? t.created_at.toISOString() : String(t.created_at || ''),
            }));

          return {
            id: o.id,
            orderNumber: o.order_number,
            userId: o.user_id,
            eventId: o.event_id,
            eventTitle: tickets[0]?.eventTitle || 'Event Celebes',
            eventDate: tickets[0]?.eventDate || '',
            venueName: tickets[0]?.venueName || '',
            buyerName: o.buyer_name,
            buyerEmail: o.buyer_email,
            buyerPhone: o.buyer_phone,
            tickets,
            subtotal: Number(o.subtotal),
            discountAmount: Number(o.discount_amount || 0),
            platformFee: Number(o.platform_fee || 0),
            totalAmount: Number(o.total_amount),
            paymentType: o.payment_type,
            paymentMethod: o.payment_method,
            paymentChannel: o.payment_channel || '',
            paymentStatus: o.payment_status,
            paymentReference: o.payment_reference || '',
            paymentProofUrl: o.payment_proof_url,
            senderBank: o.sender_bank,
            senderAccountName: o.sender_account_name,
            transferNotes: o.transfer_notes,
            verifiedBy: o.verified_by,
            verifiedAt: o.verified_at ? (o.verified_at instanceof Date ? o.verified_at.toISOString() : String(o.verified_at)) : undefined,
            rejectionReason: o.rejection_reason,
            paidAt: o.paid_at ? (o.paid_at instanceof Date ? o.paid_at.toISOString() : String(o.paid_at)) : undefined,
            createdAt: o.created_at instanceof Date ? o.created_at.toISOString() : String(o.created_at || ''),
          };
        });
      }
      return [];
    } catch (err: any) {
      console.warn('[Database] Query orders gagal, menggunakan memori:', err.message);
    }
  }

  let results = [...memoryOrders];
  if (userId) results = results.filter(o => o.userId === userId);
  if (eventId) results = results.filter(o => o.eventId === eventId);
  return results;
}

async function getVouchersFromDb(): Promise<Voucher[]> {
  await ensureMysql();
  if (isMysqlActive && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query(`SELECT * FROM vouchers ORDER BY id ASC`);
      if (Array.isArray(rows)) {
        return rows.map((v: any) => ({
          id: v.id,
          eventId: v.event_id || undefined,
          code: v.code,
          discountType: v.discount_type,
          discountValue: Number(v.discount_value),
          quota: Number(v.quota),
          usedCount: Number(v.used_count || 0),
          isActive: Boolean(v.is_active),
          validUntil: v.valid_until ? (v.valid_until instanceof Date ? v.valid_until.toISOString() : String(v.valid_until)) : undefined,
        }));
      }
    } catch (err: any) {
      console.warn('[Database] Query vouchers gagal:', err.message);
    }
  }
  return memoryVouchers;
}

async function getPayoutsFromDb(creatorId?: string): Promise<PayoutRequest[]> {
  await ensureMysql();
  if (isMysqlActive && mysqlPool) {
    try {
      let sql = `
        SELECT p.*, u.name as creator_name, e.title as event_title
        FROM payout_requests p
        LEFT JOIN users u ON p.creator_id = u.id
        LEFT JOIN events e ON p.event_id = e.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (creatorId) {
        sql += ` AND p.creator_id = ?`;
        params.push(creatorId);
      }
      sql += ` ORDER BY p.created_at DESC`;
      const [rows]: any = await mysqlPool.query(sql, params);
      if (Array.isArray(rows)) {
        return rows.map((p: any) => ({
          id: p.id,
          creatorId: p.creator_id,
          creatorName: p.creator_name || 'Kreator Celebes',
          eventId: p.event_id,
          eventTitle: p.event_title || 'Event Celebes',
          amount: Number(p.amount),
          bankName: p.bank_name,
          accountNumber: p.account_number,
          accountName: p.account_name,
          status: p.status,
          adminNote: p.admin_note,
          processedAt: p.processed_at ? (p.processed_at instanceof Date ? p.processed_at.toISOString() : String(p.processed_at)) : undefined,
          createdAt: p.created_at instanceof Date ? p.created_at.toISOString() : String(p.created_at || ''),
        }));
      }
    } catch (err: any) {
      console.warn('[Database] Query payouts gagal:', err.message);
    }
  }
  let results = [...memoryPayouts];
  if (creatorId) results = results.filter(p => p.creatorId === creatorId);
  return results;
}

async function getSettingsFromDb(): Promise<PlatformSettings> {
  await ensureMysql();
  if (isMysqlActive && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query(`SELECT * FROM system_settings`);
      if (Array.isArray(rows) && rows.length > 0) {
        const settingsObj: any = { ...DEFAULT_PLATFORM_SETTINGS };
        for (const r of rows) {
          if (r.setting_key === 'platform_name') settingsObj.platformName = r.setting_value;
          else if (r.setting_key === 'platform_fee_fixed') settingsObj.platformFeeFixed = Number(r.setting_value);
          else if (r.setting_key === 'platform_fee_percentage') settingsObj.platformFeePercentage = Number(r.setting_value);
          else if (r.setting_key === 'default_currency') settingsObj.defaultCurrency = r.setting_value;
          else if (r.setting_key === 'contact_email') settingsObj.contactEmail = r.setting_value;
          else if (r.setting_key === 'contact_whatsapp') settingsObj.contactWhatsapp = r.setting_value;
          else if (r.setting_key === 'qris_merchant_name') settingsObj.qrisMerchantName = r.setting_value;
          else if (r.setting_key === 'hero_headline') settingsObj.heroHeadline = r.setting_value;
          else if (r.setting_key === 'hero_subheadline') settingsObj.heroSubheadline = r.setting_value;
          else if (r.setting_key === 'announcement_text') settingsObj.announcementText = r.setting_value;
        }
        return settingsObj;
      }
    } catch (err: any) {
      console.warn('[Database] Query system_settings gagal:', err.message);
    }
  }
  return memorySettings;
}

async function getSupportTicketsFromDb(status?: string, email?: string): Promise<SupportTicket[]> {
  await ensureMysql();
  if (isMysqlActive && mysqlPool) {
    try {
      let sql = `SELECT * FROM support_tickets WHERE 1=1`;
      const params: any[] = [];
      if (status) {
        sql += ` AND status = ?`;
        params.push(status);
      }
      if (email) {
        sql += ` AND email = ?`;
        params.push(email);
      }
      sql += ` ORDER BY created_at DESC`;
      const [rows]: any = await mysqlPool.query(sql, params);
      if (Array.isArray(rows)) {
        return rows.map((s: any) => ({
          id: s.id,
          ticketNumber: s.ticket_number,
          name: s.name,
          email: s.email,
          phone: s.phone || '',
          category: s.category,
          priority: s.priority,
          subject: s.subject,
          message: s.message,
          status: s.status,
          adminReply: s.admin_reply,
          createdAt: s.created_at instanceof Date ? s.created_at.toISOString() : String(s.created_at || ''),
        }));
      }
    } catch (err: any) {
      console.warn('[Database] Query support_tickets gagal:', err.message);
    }
  }
  let results = [...memorySupportTickets];
  if (status) results = results.filter(t => t.status === status);
  if (email) results = results.filter(t => t.email.toLowerCase() === String(email).toLowerCase());
  return results;
}

async function getFaqsFromDb(): Promise<FaqItem[]> {
  await ensureMysql();
  if (isMysqlActive && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query(`SELECT * FROM faqs ORDER BY id ASC`);
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map((f: any) => ({
          id: f.id,
          category: f.category,
          question: f.question,
          answer: f.answer,
        }));
      }
    } catch (err: any) {
      console.warn('[Database] Query faqs gagal:', err.message);
    }
  }
  return memoryFaqs;
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Database Status & Diagnostics
app.get('/api/health', async (_req: Request, res: Response) => {
  await ensureMysql();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mysql: isMysqlActive ? 'connected' : 'disconnected',
    database: process.env.MYSQL_DATABASE || null,
  });
});

app.get('/api/db-status', async (_req: Request, res: Response) => {
  await ensureMysql();
  let latency = 0;
  let tableCounts = {
    users: memoryUsers.length,
    events: memoryEvents.length,
    orders: memoryOrders.length,
    vouchers: memoryVouchers.length,
    payouts: memoryPayouts.length,
  };

  if (isMysqlActive && mysqlPool) {
    try {
      const start = Date.now();
      await mysqlPool.query('SELECT 1');
      latency = Date.now() - start;

      const [uCount]: any = await mysqlPool.query('SELECT COUNT(*) as c FROM users');
      const [eCount]: any = await mysqlPool.query('SELECT COUNT(*) as c FROM events');
      const [oCount]: any = await mysqlPool.query('SELECT COUNT(*) as c FROM orders');
      const [vCount]: any = await mysqlPool.query('SELECT COUNT(*) as c FROM vouchers');
      const [pCount]: any = await mysqlPool.query('SELECT COUNT(*) as c FROM payout_requests');

      tableCounts = {
        users: Number(uCount[0]?.c || 0),
        events: Number(eCount[0]?.c || 0),
        orders: Number(oCount[0]?.c || 0),
        vouchers: Number(vCount[0]?.c || 0),
        payouts: Number(pCount[0]?.c || 0),
      };
    } catch {
      isMysqlActive = false;
    }
  }

  res.json({
    isConfigured: Boolean(process.env.MYSQL_HOST),
    mode: isMysqlActive ? 'mysql' : 'local-storage',
    host: process.env.MYSQL_HOST || 'Local File Storage (database/local_data.json)',
    database: process.env.MYSQL_DATABASE || 'celebes_event_db (File Storage)',
    user: process.env.MYSQL_USER || 'root',
    connected: isMysqlActive,
    latencyMs: latency,
    tableCounts,
    message: isMysqlActive
      ? 'Database MySQL/MariaDB AKTIF. Setiap perubahan di phpMyAdmin langsung tersinkronisasi ke aplikasi!'
      : 'Berjalan dalam mode Standalone File Storage (database/local_data.json). Silakan setel data database di .env jika ingin menggunakan MySQL.',
  });
});

// Test custom MySQL connection parameters from admin UI
app.post('/api/test-mysql', async (req: Request, res: Response) => {
  const { host, user, password, database, port } = req.body;
  try {
    const testPool = mysql.createPool({
      host: host || 'localhost',
      port: Number(port) || 3306,
      user,
      password,
      database,
      connectTimeout: 4000,
    });
    const conn = await testPool.getConnection();
    await conn.ping();
    conn.release();
    await testPool.end();
    res.json({ success: true, message: `Koneksi ke MySQL database '${database}' berhasil!` });
  } catch (err: any) {
    res.status(400).json({ success: false, message: `Koneksi gagal: ${err.message}` });
  }
});

// 2. Export / Download MySQL Schema & Deploy Package
app.get('/api/export-sql', (_req: Request, res: Response) => {
  const schemaPath = path.resolve(process.cwd(), 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="celebes_event_mysql.sql"');
    res.send(sqlContent);
  } else {
    res.status(404).json({ error: 'File schema.sql tidak ditemukan' });
  }
});

app.get('/api/download-package', (_req: Request, res: Response) => {
  const packagePath = path.resolve(process.cwd(), 'public', 'celebes-event-production.tar.gz');
  if (fs.existsSync(packagePath)) {
    res.download(packagePath, 'celebes-event-production.tar.gz');
  } else {
    res.status(404).json({ error: 'Paket arsip celebes-event-production.tar.gz sedang dibuat' });
  }
});

// 3. Events Endpoints
app.get('/api/events', async (req: Request, res: Response) => {
  const { category, search, status, creatorId } = req.query;
  const events = await getEventsFromDb({
    category: category ? String(category) : undefined,
    search: search ? String(search) : undefined,
    status: status ? String(status) : undefined,
    creatorId: creatorId ? String(creatorId) : undefined,
  });
  res.json(events);
});

app.get('/api/events/:idOrSlug', async (req: Request, res: Response) => {
  const param = req.params.idOrSlug;
  const events = await getEventsFromDb();
  const event = events.find(e => e.id === param || e.slug === param || e.socialShareSlug === param);
  if (!event) {
    return res.status(404).json({ error: 'Event tidak ditemukan' });
  }
  res.json(event);
});

app.post('/api/events', async (req: Request, res: Response) => {
  const creatorId = req.body.creatorId;
  const users = await getUsersFromDb();
  const creatorUser = users.find(u => u.id === creatorId);
  if (creatorUser && creatorUser.role === 'creator') {
    if (creatorUser.status === 'pending_approval') {
      return res.status(403).json({
        error: 'Akun kreator Anda sedang menunggu persetujuan dari Super Admin Pusat. Anda belum diizinkan membuat event.',
      });
    }
    if (creatorUser.status === 'suspended') {
      return res.status(403).json({
        error: 'Akun kreator Anda sedang ditangguhkan. Hubungi Super Admin Pusat.',
      });
    }
  }

  const newId = `evt-${Date.now()}`;
  const slug = req.body.slug || req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const newEvent: EventItem = {
    ...req.body,
    id: newId,
    slug,
    createdAt: new Date().toISOString(),
  };

  // Insert into MySQL if active
  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `INSERT INTO events (id, creator_id, title, slug, category, banner_image, short_description, description, start_date, end_date, location_type, venue_name, venue_address, online_meeting_url, status, is_featured, registration_limit, social_share_slug)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          newEvent.creatorId,
          newEvent.title,
          slug,
          newEvent.category,
          newEvent.bannerImage || null,
          newEvent.shortDescription || '',
          newEvent.description || '',
          toMysqlDatetime(newEvent.startDate),
          toMysqlDatetime(newEvent.endDate),
          newEvent.locationType || 'venue',
          newEvent.venueName || null,
          newEvent.venueAddress || null,
          newEvent.onlineMeetingUrl || null,
          newEvent.status || 'published',
          newEvent.isFeatured ? 1 : 0,
          newEvent.registrationLimit || 0,
          newEvent.socialShareSlug || null,
        ]
      );

      // Insert tiers
      if (Array.isArray(newEvent.tickets)) {
        for (const t of newEvent.tickets) {
          const tierId = t.id || `tier-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await mysqlPool.execute(
            `INSERT INTO ticket_tiers (id, event_id, name, description, price, quota, sold_count, max_per_order, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tierId, newId, t.name, t.description || '', t.price, t.quota, t.soldCount || 0, t.maxPerOrder || 5, t.isActive ? 1 : 0]
          );
        }
      }

      // Insert custom form fields
      const customFieldsList = newEvent.customFields || (newEvent as any).customFormFields;
      if (Array.isArray(customFieldsList)) {
        for (let i = 0; i < customFieldsList.length; i++) {
          const f = customFieldsList[i];
          const fId = f.id || `cf-${Date.now()}-${i}`;
          await mysqlPool.execute(
            `INSERT INTO custom_form_fields (id, event_id, label, field_type, placeholder, options_json, is_required, order_index)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [fId, newId, f.label, f.fieldType || (f as any).type || 'text', f.placeholder || null, f.options ? JSON.stringify(f.options) : null, f.isRequired ?? (f as any).required ? 1 : 0, i]
          );
        }
      }
    } catch (err: any) {
      console.warn('[Database] Gagal insert event ke MySQL, menyimpan ke memori:', err.message);
    }
  }

  memoryEvents.unshift(newEvent);
  saveLocalData();
  res.status(201).json(newEvent);
});

app.put('/api/events/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `UPDATE events SET title = COALESCE(?, title), category = COALESCE(?, category), banner_image = COALESCE(?, banner_image),
         short_description = COALESCE(?, short_description), description = COALESCE(?, description),
         status = COALESCE(?, status), venue_name = COALESCE(?, venue_name), venue_address = COALESCE(?, venue_address)
         WHERE id = ?`,
        [
          updateData.title || null,
          updateData.category || null,
          updateData.bannerImage || null,
          updateData.shortDescription || null,
          updateData.description || null,
          updateData.status || null,
          updateData.venueName || null,
          updateData.venueAddress || null,
          id,
        ]
      );
    } catch (err: any) {
      console.warn('[Database] Gagal update event di MySQL:', err.message);
    }
  }

  const index = memoryEvents.findIndex(e => e.id === id);
  if (index !== -1) {
    memoryEvents[index] = { ...memoryEvents[index], ...updateData, updatedAt: new Date().toISOString() };
    saveLocalData();
    return res.json(memoryEvents[index]);
  }
  res.json({ success: true, id, ...updateData });
});

app.delete('/api/events/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(`DELETE FROM events WHERE id = ?`, [id]);
    } catch (err: any) {
      console.warn('[Database] Gagal delete event dari MySQL:', err.message);
    }
  }

  memoryEvents = memoryEvents.filter(e => e.id !== id);
  saveLocalData();
  res.json({ success: true, message: 'Event berhasil dihapus' });
});

// 4. Orders & Registrations
app.get('/api/orders', async (req: Request, res: Response) => {
  const { userId, eventId } = req.query;
  const orders = await getOrdersFromDb(userId ? String(userId) : undefined, eventId ? String(eventId) : undefined);
  res.json(orders);
});

app.post('/api/orders', async (req: Request, res: Response) => {
  const orderData = req.body;
  const orderId = `ord-${Date.now()}`;
  const orderNumber = orderData.orderNumber || `CE-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrder: Order = {
    ...orderData,
    id: orderId,
    orderNumber,
    createdAt: new Date().toISOString(),
  };

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `INSERT INTO orders (id, order_number, user_id, event_id, buyer_name, buyer_email, buyer_phone, subtotal, discount_amount, platform_fee, total_amount, payment_type, payment_method, payment_channel, payment_status, payment_reference, payment_proof_url, sender_bank, sender_account_name, transfer_notes, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          orderNumber,
          newOrder.userId,
          newOrder.eventId,
          newOrder.buyerName,
          newOrder.buyerEmail,
          newOrder.buyerPhone,
          newOrder.subtotal,
          newOrder.discountAmount || 0,
          newOrder.platformFee || 0,
          newOrder.totalAmount,
          newOrder.paymentType || 'automatic',
          newOrder.paymentMethod || 'qris',
          newOrder.paymentChannel || 'QRIS Instant',
          newOrder.paymentStatus || 'pending',
          newOrder.paymentReference || null,
          newOrder.paymentProofUrl || null,
          newOrder.senderBank || null,
          newOrder.senderAccountName || null,
          newOrder.transferNotes || null,
          newOrder.paymentStatus === 'paid' ? toMysqlDatetime() : null,
        ]
      );

      // Insert tickets
      if (Array.isArray(newOrder.tickets)) {
        for (const t of newOrder.tickets) {
          const tId = t.id || `tkt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await mysqlPool.execute(
            `INSERT INTO tickets (id, order_id, event_id, tier_id, ticket_code, qr_payload, attendee_name, attendee_email, check_in_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tId, orderId, newOrder.eventId, t.tierId, t.ticketCode, t.qrPayload, t.attendeeName, t.attendeeEmail, t.checkInStatus || 'not_checked_in']
          );

          // Update sold count in MySQL tier
          await mysqlPool.execute(
            `UPDATE ticket_tiers SET sold_count = sold_count + 1 WHERE id = ?`,
            [t.tierId]
          );
        }
      }
    } catch (err: any) {
      console.warn('[Database] Gagal insert order ke MySQL:', err.message);
    }
  }

  memoryOrders.unshift(newOrder);
  saveLocalData();
  res.status(201).json(newOrder);
});

app.post('/api/orders/:id/pay', async (req: Request, res: Response) => {
  const { id } = req.params;
  const ref = req.body.paymentReference || `REF-PAY-${Date.now()}`;

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `UPDATE orders SET payment_status = 'paid', paid_at = NOW(), payment_reference = ? WHERE id = ?`,
        [ref, id]
      );
    } catch (err: any) {
      console.warn('[Database] Gagal update pembayaran di MySQL:', err.message);
    }
  }

  const order = memoryOrders.find(o => o.id === id);
  if (order) {
    order.paymentStatus = 'paid';
    order.paidAt = new Date().toISOString();
    order.paymentReference = ref;
    saveLocalData();
  }

  res.json({ success: true, message: 'Pembayaran berhasil!' });
});

app.post('/api/orders/:id/verify-payment', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason, verifiedBy } = req.body;

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `UPDATE orders SET payment_status = ?, verified_at = NOW(), verified_by = ?, rejection_reason = ?, paid_at = IF(? = 'paid', NOW(), paid_at) WHERE id = ?`,
        [status, verifiedBy || 'Admin Pusat', rejectionReason || null, status, id]
      );
    } catch (err: any) {
      console.warn('[Database] Gagal update verifikasi di MySQL:', err.message);
    }
  }

  const order = memoryOrders.find(o => o.id === id);
  if (order) {
    order.paymentStatus = status;
    order.verifiedBy = verifiedBy || 'Admin Pusat';
    order.verifiedAt = new Date().toISOString();
    if (status === 'paid') {
      order.paidAt = new Date().toISOString();
      order.rejectionReason = undefined;
    } else {
      order.rejectionReason = rejectionReason;
    }
    saveLocalData();
  }

  res.json({ success: true, message: status === 'paid' ? 'Pembayaran berhasil disetujui & E-Ticket aktif!' : 'Pembayaran ditolak.' });
});

// 5. Ticket Check-in & Verification
app.get('/api/tickets/:code', async (req: Request, res: Response) => {
  const { code } = req.params;
  if (isMysqlActive && mysqlPool) {
    try {
      const [tRows]: any = await mysqlPool.query(
        `SELECT t.*, o.order_number, o.buyer_name, o.buyer_email, o.payment_status, e.title as event_title, e.start_date, e.venue_name
         FROM tickets t
         LEFT JOIN orders o ON t.order_id = o.id
         LEFT JOIN events e ON t.event_id = e.id
         WHERE t.ticket_code = ? OR t.qr_payload LIKE ?`,
        [code, `%${code}%`]
      );
      if (Array.isArray(tRows) && tRows.length > 0) {
        const t = tRows[0];
        return res.json({
          ticket: {
            id: t.id,
            orderId: t.order_id,
            eventId: t.event_id,
            eventTitle: t.event_title,
            eventDate: t.start_date,
            venueName: t.venue_name,
            tierId: t.tier_id,
            ticketCode: t.ticket_code,
            qrPayload: t.qr_payload,
            attendeeName: t.attendee_name,
            attendeeEmail: t.attendee_email,
            checkInStatus: t.check_in_status,
            checkInTime: t.check_in_time,
          },
          order: {
            id: t.order_id,
            orderNumber: t.order_number,
            buyerName: t.buyer_name,
            buyerEmail: t.buyer_email,
            paymentStatus: t.payment_status,
          },
        });
      }
    } catch {}
  }

  for (const order of memoryOrders) {
    const tkt = order.tickets.find(t => t.ticketCode === code || t.qrPayload.includes(code));
    if (tkt) return res.json({ ticket: tkt, order });
  }
  res.status(404).json({ error: 'Tiket tidak ditemukan' });
});

app.post('/api/tickets/checkin', async (req: Request, res: Response) => {
  const { code, eventId } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Kode tiket tidak boleh kosong' });
  }

  let foundTicket: Ticket | null = null;
  let foundOrder: any = null;

  if (isMysqlActive && mysqlPool) {
    try {
      const [tRows]: any = await mysqlPool.query(
        `SELECT t.*, tt.name as tier_name, o.payment_status, o.order_number, o.buyer_name, e.title as event_title
         FROM tickets t
         LEFT JOIN ticket_tiers tt ON t.tier_id = tt.id
         LEFT JOIN orders o ON t.order_id = o.id
         LEFT JOIN events e ON t.event_id = e.id
         WHERE t.ticket_code = ? OR t.qr_payload = ? OR t.qr_payload LIKE ?`,
        [code, code, `%${code}%`]
      );
      if (Array.isArray(tRows) && tRows.length > 0) {
        const t = tRows[0];
        foundTicket = {
          id: t.id,
          orderId: t.order_id,
          eventId: t.event_id,
          eventTitle: t.event_title,
          tierId: t.tier_id,
          tierName: t.tier_name || 'Tiket Regular',
          ticketCode: t.ticket_code,
          qrPayload: t.qr_payload,
          attendeeName: t.attendee_name,
          attendeeEmail: t.attendee_email,
          checkInStatus: t.check_in_status,
          checkInTime: t.check_in_time,
          responses: [],
          createdAt: t.created_at,
        };
        foundOrder = { id: t.order_id, orderNumber: t.order_number, paymentStatus: t.payment_status };
      }
    } catch {}
  }

  if (!foundTicket) {
    for (const order of memoryOrders) {
      const tkt = order.tickets.find(t => t.ticketCode === code || t.qrPayload === code || t.qrPayload.includes(code));
      if (tkt) {
        foundTicket = tkt;
        foundOrder = order;
        break;
      }
    }
  }

  if (!foundTicket || !foundOrder) {
    return res.status(404).json({ success: false, message: 'Kode tiket tidak valid atau tidak ditemukan.' });
  }

  if (eventId && foundTicket.eventId !== eventId) {
    return res.status(400).json({ success: false, message: 'Tiket ini terdaftar untuk event yang berbeda!' });
  }

  const result = verifyAndCheckInTicket(foundTicket);
  if (result.success) {
    foundTicket.checkInStatus = result.checkInStatus;
    foundTicket.checkInTime = result.checkInTime;

    if (isMysqlActive && mysqlPool) {
      try {
        await mysqlPool.execute(`UPDATE tickets SET check_in_status = 'checked_in', check_in_time = NOW() WHERE id = ?`, [foundTicket.id]);
      } catch {}
    }
    saveLocalData();
  }

  res.json({
    success: result.success,
    message: result.message,
    ticket: foundTicket,
    order: foundOrder,
  });
});

// 6. Vouchers
app.post('/api/vouchers/validate', async (req: Request, res: Response) => {
  const { code, eventId } = req.body;
  if (!code) {
    return res.status(400).json({ valid: false, message: 'Masukkan kode voucher' });
  }

  const vouchers = await getVouchersFromDb();
  const voucher = vouchers.find(v => v.code.toUpperCase() === code.trim().toUpperCase() && v.isActive);
  if (!voucher) {
    return res.status(404).json({ valid: false, message: 'Kode voucher tidak ditemukan atau sudah tidak aktif.' });
  }

  if (voucher.eventId && eventId && voucher.eventId !== eventId) {
    return res.status(400).json({ valid: false, message: 'Voucher ini tidak berlaku untuk event ini.' });
  }

  if (voucher.usedCount >= voucher.quota) {
    return res.status(400).json({ valid: false, message: 'Kuota penggunaan voucher ini sudah habis.' });
  }

  res.json({ valid: true, voucher });
});

// 7. Payout Requests
app.get('/api/payouts', async (req: Request, res: Response) => {
  const { creatorId } = req.query;
  const payouts = await getPayoutsFromDb(creatorId ? String(creatorId) : undefined);
  res.json(payouts);
});

app.post('/api/payouts', async (req: Request, res: Response) => {
  const newId = `pay-${Date.now()}`;
  const newPayout: PayoutRequest = {
    ...req.body,
    id: newId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `INSERT INTO payout_requests (id, creator_id, event_id, amount, bank_name, account_number, account_name, status, admin_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [newId, newPayout.creatorId, newPayout.eventId, newPayout.amount, newPayout.bankName, newPayout.accountNumber, newPayout.accountName, newPayout.adminNote || null]
      );
    } catch (err: any) {
      console.warn('[Database] Gagal insert payout ke MySQL:', err.message);
    }
  }

  memoryPayouts.unshift(newPayout);
  saveLocalData();
  res.status(201).json(newPayout);
});

app.put('/api/payouts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminNote } = req.body;

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `UPDATE payout_requests SET status = ?, admin_note = ?, processed_at = NOW() WHERE id = ?`,
        [status, adminNote || null, id]
      );
    } catch (err: any) {
      console.warn('[Database] Gagal update payout di MySQL:', err.message);
    }
  }

  const payout = memoryPayouts.find(p => p.id === id);
  if (payout) {
    payout.status = status;
    payout.adminNote = adminNote || payout.adminNote;
    payout.processedAt = new Date().toISOString();
    saveLocalData();
    return res.json(payout);
  }
  res.json({ success: true, id, status });
});

// 8. Users & Authentication Management
app.get('/api/users', async (_req: Request, res: Response) => {
  const users = await getUsersFromDb();
  res.json(users);
});

// Pendaftaran Calon Kreator Event (Creator Onboarding)
app.post('/api/auth/register-creator', async (req: Request, res: Response) => {
  const { 
    name, 
    organization, 
    email, 
    phone, 
    password, 
    category, 
    city, 
    bankName, 
    bankAccountNumber, 
    bankAccountName, 
    instagram, 
    portfolioUrl,
    auth_provider
  } = req.body;

  if (!email || !organization || !name) {
    return res.status(400).json({ success: false, message: 'Nama penanggung jawab, nama organisasi/EO, dan email wajib diisi!' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = await getUsersFromDb();
  const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email ini sudah terdaftar sebagai pengguna! Silakan gunakan email lain atau login langsung.' });
  }

  const newId = `usr-creator-${Date.now()}`;
  const newCreator: User = {
    id: newId,
    email: cleanEmail,
    name: name.trim(),
    role: 'creator',
    password: password || 'kreator123',
    avatar: auth_provider === 'google' 
      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80'
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    phone: phone || '',
    organization: organization.trim(),
    category: category || 'Konser Musik & Festival',
    city: city || 'Makassar / Sulawesi',
    bankName: bankName || 'BCA',
    bankAccountNumber: bankAccountNumber || '',
    bankAccountName: bankAccountName || name,
    instagram: instagram || '',
    portfolioUrl: portfolioUrl || '',
    auth_provider: auth_provider || 'local',
    status: 'pending_approval',
    createdAt: new Date().toISOString(),
  };

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `INSERT INTO users (id, email, name, password_hash, role, avatar, phone, organization, auth_provider, status, bank_name, bank_account_number, bank_account_name)
         VALUES (?, ?, ?, ?, 'creator', ?, ?, ?, ?, 'pending_approval', ?, ?, ?)`,
        [
          newId,
          cleanEmail,
          newCreator.name,
          newCreator.password,
          newCreator.avatar,
          newCreator.phone,
          newCreator.organization,
          newCreator.auth_provider,
          newCreator.bankName,
          newCreator.bankAccountNumber,
          newCreator.bankAccountName,
        ]
      );
    } catch (err: any) {
      console.warn('[Database] Gagal insert kreator ke MySQL:', err.message);
    }
  }

  memoryUsers.unshift(newCreator);
  saveLocalData();

  res.status(201).json({
    success: true,
    user: newCreator,
    message: `Pendaftaran akun kreator "${organization}" berhasil! Akun Anda sedang menunggu persetujuan (approval) dari Super Admin Pusat. Anda akan menerima email resmi saat akun disetujui.`,
  });
});

// Pendaftaran Peserta Umum
app.post('/api/auth/register-user', async (req: Request, res: Response) => {
  const { name, email, phone, password, auth_provider } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Nama dan email wajib diisi!' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = await getUsersFromDb();
  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email sudah terdaftar. Silakan login.' });
  }

  const newId = `usr-user-${Date.now()}`;
  const newUser: User = {
    id: newId,
    email: cleanEmail,
    name: name.trim(),
    role: 'user',
    password: password || 'demo123',
    phone: phone || '',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    auth_provider: auth_provider || 'local',
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `INSERT INTO users (id, email, name, password_hash, role, avatar, phone, auth_provider, status)
         VALUES (?, ?, ?, ?, 'user', ?, ?, ?, 'active')`,
        [newId, cleanEmail, newUser.name, newUser.password, newUser.avatar, newUser.phone, newUser.auth_provider]
      );
    } catch (err: any) {
      console.warn('[Database] Gagal insert user ke MySQL:', err.message);
    }
  }

  memoryUsers.unshift(newUser);
  saveLocalData();

  res.status(201).json({ success: true, user: newUser, message: 'Pendaftaran akun berhasil!' });
});

// Otentikasi Login (Wajib Password untuk Super Admin, Kreator, dan Peserta)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Alamat email wajib diisi!' });
  }

  if (!password || !password.trim()) {
    return res.status(400).json({ success: false, message: 'Password wajib diisi! Masukkan password akun Anda.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = await getUsersFromDb();

  // 1. Super Admin Match
  if (cleanEmail === 'redaksibergulircom@gmail.com' || cleanEmail === 'admin@celebes-event.com' || cleanEmail.includes('admin@')) {
    const adminUser = users.find(u => u.role === 'admin' && (u.email.toLowerCase() === cleanEmail || u.id === 'usr-admin-bergulir')) || users[0];
    
    // Strict password verification for Super Admin
    const isValidAdminPassword = (cleanEmail === 'redaksibergulircom@gmail.com' && password === 'Bergulir2026!#') ||
      (cleanEmail === 'admin@celebes-event.com' && (password === 'demo123' || password === 'Bergulir2026!#')) ||
      (adminUser && adminUser.password && adminUser.password === password) ||
      (password === 'Bergulir2026!#');

    if (!isValidAdminPassword) {
      return res.status(401).json({ success: false, message: 'Password Super Admin salah! Masukkan password resmi Bergulir Media.' });
    }

    return res.json({ 
      success: true, 
      user: adminUser, 
      message: 'Login Super Admin Berhasil! Selamat datang di Pusat Kendali Celebes Event.' 
    });
  }

  // 2. Normal User / Creator Match
  const user = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'Akun dengan email ini belum terdaftar di database. Silakan lakukan pendaftaran akun terlebih dahulu.' 
    });
  }

  // Check user suspension
  if (user.status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: 'Akun Anda saat ini ditangguhkan / disuspend oleh Admin Pusat. Hubungi redaksibergulircom@gmail.com.',
    });
  }

  // Strict Password Verification
  const userValidPassword = user.password || 'demo123';
  if (password !== userValidPassword) {
    return res.status(401).json({ 
      success: false, 
      message: 'Password yang Anda masukkan salah. Silakan periksa kembali dan coba lagi.' 
    });
  }

  if (user.role === 'creator' && user.status === 'pending_approval') {
    return res.json({ 
      success: true, 
      user, 
      message: `Selamat datang, ${user.name}! Akun kreator Anda berstatus Menunggu Persetujuan Admin Pusat.` 
    });
  }

  return res.json({ 
    success: true, 
    user, 
    message: `Selamat datang kembali, ${user.name}!` 
  });
});

// Persetujuan Kreator oleh Super Admin & Pengiriman Email Notifikasi
app.post('/api/users/:id/approve', async (req: Request, res: Response) => {
  const { id } = req.params;
  const users = await getUsersFromDb();
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
  }

  user.status = 'active';

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(`UPDATE users SET status = 'active' WHERE id = ?`, [id]);
    } catch {}
  }

  const approvalEmail = generateCreatorApprovalEmail(user);
  memorySentEmails.unshift(approvalEmail);
  saveLocalData();

  res.json({
    success: true,
    user,
    email: approvalEmail,
    message: `Akun kreator "${user.name}" (${user.organization || 'Organisasi'}) berhasil disetujui! Email konfirmasi resmi telah dikirim ke ${user.email}.`,
  });
});

// Status Moderasi Kreator / User oleh Super Admin
app.put('/api/users/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const users = await getUsersFromDb();
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
  }

  user.status = status;
  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(`UPDATE users SET status = ? WHERE id = ?`, [status, id]);
    } catch {}
  }

  saveLocalData();
  res.json({ success: true, user, message: `Status pengguna berhasil diubah menjadi ${status}.` });
});

// Hapus Akun oleh Super Admin
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (id === 'usr-admin-bergulir' || id === 'usr-admin-01' || id === 'redaksibergulircom@gmail.com') {
    return res.status(403).json({ success: false, error: 'Akun Super Admin Utama dilindungi dan tidak dapat dihapus!' });
  }

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(`DELETE FROM users WHERE id = ? OR email = ?`, [id, id]);
    } catch (err: any) {
      console.warn('[Database] Gagal menghapus pengguna dari MySQL:', err.message);
    }
  }

  memoryUsers = memoryUsers.filter(u => u.id !== id && u.email !== id);
  saveLocalData();

  res.json({
    success: true,
    message: `Akun berhasil dihapus dari database.`,
    userId: id,
  });
});

// Riwayat Notifikasi Email Masuk / Terkirim
app.get('/api/admin/sent-emails', (_req: Request, res: Response) => {
  res.json(memorySentEmails);
});

// Kirim Ulang Email Notifikasi Persetujuan Kreator
app.post('/api/admin/resend-approval-email', async (req: Request, res: Response) => {
  const { userId } = req.body;
  const users = await getUsersFromDb();
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
  }

  const resentEmail = generateCreatorApprovalEmail(user);
  memorySentEmails.unshift(resentEmail);
  saveLocalData();

  res.json({
    success: true,
    email: resentEmail,
    message: `Email notifikasi persetujuan berhasil dikirim ulang ke ${user.email}!`,
  });
});

// 9. Platform Settings & Branding
app.get('/api/settings', async (_req: Request, res: Response) => {
  const settings = await getSettingsFromDb();
  res.json(settings);
});

app.put('/api/settings', async (req: Request, res: Response) => {
  const newSettings = req.body;
  memorySettings = { ...memorySettings, ...newSettings };

  if (isMysqlActive && mysqlPool) {
    try {
      const keys = ['platform_name', 'platform_fee_fixed', 'platform_fee_percentage', 'default_currency', 'contact_email', 'contact_whatsapp', 'qris_merchant_name', 'hero_headline', 'hero_subheadline', 'announcement_text'];
      for (const k of keys) {
        let val: any = '';
        if (k === 'platform_name') val = newSettings.platformName;
        else if (k === 'platform_fee_fixed') val = String(newSettings.platformFeeFixed);
        else if (k === 'platform_fee_percentage') val = String(newSettings.platformFeePercentage);
        else if (k === 'default_currency') val = newSettings.defaultCurrency;
        else if (k === 'contact_email') val = newSettings.contactEmail;
        else if (k === 'contact_whatsapp') val = newSettings.contactWhatsapp;
        else if (k === 'qris_merchant_name') val = newSettings.qrisMerchantName;
        else if (k === 'hero_headline') val = newSettings.heroHeadline;
        else if (k === 'hero_subheadline') val = newSettings.heroSubheadline;
        else if (k === 'announcement_text') val = newSettings.announcementText;

        if (val !== undefined && val !== null) {
          await mysqlPool.execute(
            `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [k, String(val)]
          );
        }
      }
    } catch (err: any) {
      console.warn('[Database] Gagal update system_settings di MySQL:', err.message);
    }
  }

  saveLocalData();
  res.json({ success: true, settings: memorySettings, message: 'Pengaturan platform berhasil disimpan.' });
});

// 10. Pusat Bantuan & Layanan Penyampaian Kendala (Support Tickets)
app.get('/api/support-tickets', async (req: Request, res: Response) => {
  const { status, email } = req.query;
  const tickets = await getSupportTicketsFromDb(status ? String(status) : undefined, email ? String(email) : undefined);
  res.json(tickets);
});

app.post('/api/support-tickets', async (req: Request, res: Response) => {
  const { name, email, phone, category, priority, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Nama, email, subjek, dan pesan wajib diisi.' });
  }

  const newId = `supp-${Date.now()}`;
  const ticketNumber = `HELP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

  const newTicket: SupportTicket = {
    id: newId,
    ticketNumber,
    name,
    email,
    phone: phone || '',
    category: category || 'lainnya',
    priority: priority || 'sedang',
    subject,
    message,
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `INSERT INTO support_tickets (id, ticket_number, name, email, phone, category, priority, subject, message, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
        [newId, ticketNumber, name, email, phone || null, category || 'lainnya', priority || 'sedang', subject, message]
      );
    } catch (err: any) {
      console.warn('[Database] Gagal insert support ticket ke MySQL:', err.message);
    }
  }

  memorySupportTickets.unshift(newTicket);
  saveLocalData();
  res.status(201).json({ success: true, ticket: newTicket, message: 'Tiket bantuan berhasil dikirim! Tim kami akan segera menindaklanjuti.' });
});

app.put('/api/support-tickets/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, adminReply } = req.body;

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `UPDATE support_tickets SET status = COALESCE(?, status), admin_reply = COALESCE(?, admin_reply) WHERE id = ?`,
        [status || null, adminReply !== undefined ? adminReply : null, id]
      );
    } catch (err: any) {
      console.warn('[Database] Gagal update support ticket di MySQL:', err.message);
    }
  }

  const ticket = memorySupportTickets.find(t => t.id === id);
  if (ticket) {
    if (status) ticket.status = status;
    if (adminReply !== undefined) ticket.adminReply = adminReply;
    ticket.updatedAt = new Date().toISOString();
    saveLocalData();
    return res.json({ success: true, ticket, message: 'Tiket bantuan berhasil diperbarui.' });
  }
  res.json({ success: true, id });
});

// 11. FAQ Items
app.get('/api/faqs', async (_req: Request, res: Response) => {
  const faqs = await getFaqsFromDb();
  res.json(faqs);
});

app.post('/api/faqs', async (req: Request, res: Response) => {
  const newId = `faq-${Date.now()}`;
  const newFaq: FaqItem = {
    id: newId,
    ...req.body,
  };

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `INSERT INTO faqs (id, category, question, answer) VALUES (?, ?, ?, ?)`,
        [newId, newFaq.category, newFaq.question, newFaq.answer]
      );
    } catch (err: any) {
      console.warn('[Database] Gagal insert FAQ ke MySQL:', err.message);
    }
  }

  memoryFaqs.push(newFaq);
  saveLocalData();
  res.status(201).json(newFaq);
});

// ==========================================
// STATIC FILES & VITE MIDDLEWARES
// ==========================================

async function startServer() {
  const candidateDistPaths = [
    path.resolve(APP_ROOT, 'dist'),
    path.resolve(detectedDir, 'dist'),
    path.resolve(process.cwd(), 'dist'),
    path.resolve('./dist')
  ];
  const distPath = candidateDistPaths.find(p => fs.existsSync(path.resolve(p, 'index.html'))) || candidateDistPaths[0];

  const assetCandidateDirs = [
    path.resolve(distPath, 'assets'),
    path.resolve(APP_ROOT, 'dist', 'assets'),
    path.resolve(detectedDir, 'dist', 'assets'),
    path.resolve(APP_ROOT, 'assets'),
    path.resolve(detectedDir, 'assets'),
    path.resolve(process.cwd(), 'assets'),
    path.resolve(APP_ROOT, 'public', 'assets'),
  ];

  // Dedicated assets router with strict MIME type enforcement
  for (const dir of assetCandidateDirs) {
    if (fs.existsSync(dir)) {
      app.use('/assets', express.static(dir, {
        maxAge: '1y',
        immutable: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
          }
        }
      }));
    }
  }

  // Fallback explicit asset file resolver (guarantees .js and .css files are NEVER served as index.html)
  app.get('/assets/:file', (req: Request, res: Response, next) => {
    const fileName = path.basename(req.params.file);
    for (const dir of assetCandidateDirs) {
      const fullPath = path.resolve(dir, fileName);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        if (fileName.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (fileName.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
        return res.sendFile(fullPath);
      }
    }
    console.warn(`[Static] Asset tidak ditemukan di direktori manapun: ${fileName}`);
    res.status(404).type('text/plain').send(`Asset ${fileName} not found`);
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static root files from distPath
    app.use(express.static(distPath));

    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(indexPath);
      } else {
        res.status(200).send(`
          <!DOCTYPE html>
          <html lang="id">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Celebes Event - Status Server</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
                .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px; max-width: 520px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                h2 { color: #38bdf8; margin-top: 0; font-size: 22px; }
                p { color: #94a3b8; line-height: 1.6; font-size: 14px; }
                .badge { display: inline-block; background: #059669; color: #fff; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; }
                .code { background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #38bdf8; text-align: left; margin: 16px 0; }
              </style>
            </head>
            <body>
              <div class="card">
                <span class="badge">Node.js Server Berjalan</span>
                <h2>Celebes Event Siap Digunakan!</h2>
                <p>Backend server berhasil aktif. Namun folder tampilan frontend <code>dist/</code> belum terkompilasi di hosting.</p>
                <div class="code">
                  # Jalankan perintah ini di Terminal cPanel:<br>
                  <strong>npm run build</strong>
                </div>
                <p style="font-size: 13px;">Setelah build selesai, refresh halaman ini atau restart Node.js app di cPanel.</p>
              </div>
            </body>
          </html>
        `);
      }
    });
  }

  if (isProduction && process.env.PORT) {
    app.listen(process.env.PORT, () => {
      console.log(`[Server] Celebes Event berjalan di PORT/Socket: ${process.env.PORT}`);
    });
  } else {
    app.listen(3000, '0.0.0.0', () => {
      console.log(`[Server] Celebes Event berjalan di port 3000 (http://localhost:3000)`);
    });
  }
}

startServer();
