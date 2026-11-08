import express, { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { INITIAL_USERS, INITIAL_EVENTS, INITIAL_ORDERS, INITIAL_VOUCHERS, INITIAL_PAYOUTS, DEFAULT_PLATFORM_SETTINGS, INITIAL_SUPPORT_TICKETS, INITIAL_FAQS, INITIAL_SENT_EMAILS, INITIAL_NATIONAL_EVENTS, INITIAL_EVENT_NEWS } from './src/data/seedData';
import { EventItem, Order, User, Voucher, PayoutRequest, Ticket, PlatformSettings, SupportTicket, FaqItem, SentEmailNotification, NationalEventLink, EventNews } from './src/types';
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
let memoryNews: EventNews[] = JSON.parse(JSON.stringify(INITIAL_EVENT_NEWS));

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
      news: memoryNews,
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
      if (Array.isArray(parsed.news)) memoryNews = parsed.news;
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

export function getSuperAdminCredentials() {
  const email = (process.env.SUPERADMIN_EMAIL || 'redaksibergulircom@gmail.com').trim().toLowerCase();
  const password = (process.env.SUPERADMIN_PASSWORD || 'Bergulir2026!#').trim();
  const name = (process.env.SUPERADMIN_NAME || 'Super Admin Bergulir Media').trim();
  return { email, password, name };
}

export function getMidtransConfig() {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || memorySettings.qrisConfig?.serverKey || '').trim();
  const clientKey = (process.env.MIDTRANS_CLIENT_KEY || memorySettings.qrisConfig?.clientKey || '').trim();
  const merchantId = (process.env.MIDTRANS_MERCHANT_ID || memorySettings.qrisConfig?.merchantId || '').trim();
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true' || (memorySettings.qrisConfig?.isEnabled && !memorySettings.qrisConfig?.isSandbox);
  const isEnabled = memorySettings.qrisConfig?.isEnabled !== false;

  const snapBaseUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1';

  const apiBaseUrl = isProduction
    ? 'https://api.midtrans.com/v2'
    : 'https://api.sandbox.midtrans.com/v2';

  return {
    serverKey,
    clientKey,
    merchantId,
    isProduction,
    isEnabled,
    snapBaseUrl,
    apiBaseUrl,
    hasServerKey: Boolean(serverKey && serverKey.length > 5),
  };
}

async function getUsersFromDb(): Promise<User[]> {
  const { email: adminEmail, password: adminPassword, name: adminName } = getSuperAdminCredentials();
  await ensureMysql();
  if (isMysqlActive && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query(`SELECT * FROM users ORDER BY created_at DESC`);
      if (Array.isArray(rows)) {
        return rows.map((r: any) => {
          const isSuperAdmin = r.id === 'usr-admin-bergulir' || r.role === 'admin' || (r.email && r.email.toLowerCase() === adminEmail);
          return {
            id: r.id,
            email: isSuperAdmin ? adminEmail : r.email,
            name: isSuperAdmin && adminName ? adminName : r.name,
            password: isSuperAdmin && adminPassword ? adminPassword : (r.password_hash || ''),
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
          };
        });
      }
    } catch (err: any) {
      console.warn('[Database] Query users gagal, menggunakan memori:', err.message);
    }
  }

  // Sync memory users with environment variable settings
  return memoryUsers.map(u => {
    if (u.id === 'usr-admin-bergulir' || u.role === 'admin' || u.email.toLowerCase() === adminEmail) {
      return {
        ...u,
        email: adminEmail,
        name: adminName || u.name,
        password: adminPassword,
      };
    }
    return u;
  });
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
      await mysqlPool.execute(`DELETE FROM custom_form_fields WHERE event_id = ?`, [id]);
      await mysqlPool.execute(`DELETE FROM ticket_tiers WHERE event_id = ?`, [id]);
      await mysqlPool.execute(`DELETE FROM tickets WHERE event_id = ?`, [id]);
      await mysqlPool.execute(`DELETE FROM orders WHERE event_id = ?`, [id]);
      await mysqlPool.execute(`DELETE FROM events WHERE id = ?`, [id]);
    } catch (err: any) {
      console.warn('[Database] Gagal delete event dari MySQL:', err.message);
    }
  }

  memoryEvents = memoryEvents.filter(e => e.id !== id);
  // Also clean up orders/tickets associated with this event
  memoryOrders = memoryOrders.filter(o => o.eventId !== id);
  saveLocalData();
  res.json({ success: true, message: 'Event beserta seluruh tiket terkait berhasil dihapus' });
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

  // Strict payment status enforcement:
  // If paymentType is manual -> 'pending_manual_verification'
  // If paymentType is automatic -> 'pending' (NEVER auto-paid!)
  // Only free tickets (totalAmount === 0) are marked 'paid' automatically.
  const isFree = Number(orderData.totalAmount) === 0;
  const initialStatus = isFree 
    ? 'paid' 
    : (orderData.paymentType === 'manual' ? 'pending_manual_verification' : 'pending');

  const subtotal = Math.max(0, Number(orderData.subtotal) || 0);
  const platformFee = isFree ? 0 : 2000;
  const totalAmount = isFree ? 0 : Math.max(0, subtotal + platformFee - (Number(orderData.discountAmount) || 0));

  // Blueprint v3 Split Fee Calculation:
  // 1. Total Bayar User = Harga Tiket Asli + Rp 2.000 (Biaya Admin)
  // 2. Komisi Platform = 2% × Harga Tiket Asli
  // 3. Pendapatan Bersih Kreator = Harga Tiket Asli - Komisi Platform
  // 4. Total Pendapatan Platform = Rp 2.000 (dari User) + Komisi Platform (dari Kreator)
  const hargaTiketAsli = subtotal;
  const potonganKreator = isFree ? 0 : Math.round(0.02 * hargaTiketAsli);
  const netPendapatanKreator = isFree ? 0 : Math.max(0, hargaTiketAsli - potonganKreator);
  const totalMarginPlatform = isFree ? 0 : (platformFee + potonganKreator);

  const matchedEvent = memoryEvents.find(e => e.id === orderData.eventId);
  const creatorId = orderData.creatorId || matchedEvent?.creatorId;
  const creatorName = orderData.creatorName || matchedEvent?.creatorName;

  const newOrder: Order = {
    ...orderData,
    id: orderId,
    orderNumber,
    subtotal,
    platformFee,
    totalAmount,
    hargaTiketAsli,
    biayaAdminUser: platformFee,
    potonganKreator,
    netPendapatanKreator,
    totalMarginPlatform,
    creatorId,
    creatorName,
    paymentStatus: initialStatus,
    paidAt: isFree ? new Date().toISOString() : undefined,
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
          newOrder.paymentStatus,
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

// Hapus Order Transaksi oleh Super Admin
app.delete('/api/orders/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const targetOrder = memoryOrders.find(o => o.id === id || o.orderNumber === id);
  if (targetOrder) {
    // If order had tickets, decrease sold count on event ticket tiers
    if (Array.isArray(targetOrder.tickets)) {
      for (const t of targetOrder.tickets) {
        if (isMysqlActive && mysqlPool) {
          try {
            await mysqlPool.execute(`UPDATE ticket_tiers SET sold_count = GREATEST(0, sold_count - 1) WHERE id = ?`, [t.tierId]);
          } catch {}
        }
        for (const evt of memoryEvents) {
          const tier = evt.tickets?.find(k => k.id === t.tierId);
          if (tier) {
            tier.soldCount = Math.max(0, (tier.soldCount || 1) - 1);
          }
        }
      }
    }
  }

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(`DELETE FROM tickets WHERE order_id = ? OR order_id IN (SELECT id FROM orders WHERE order_number = ?)`, [id, id]);
      await mysqlPool.execute(`DELETE FROM orders WHERE id = ? OR order_number = ?`, [id, id]);
    } catch (err: any) {
      console.warn('[Database] Gagal delete order dari MySQL:', err.message);
    }
  }

  memoryOrders = memoryOrders.filter(o => o.id !== id && o.orderNumber !== id);
  saveLocalData();
  res.json({ success: true, message: `Transaksi order ${targetOrder?.orderNumber || id} berhasil dihapus dari database.` });
});

app.post('/api/orders/:id/pay', async (req: Request, res: Response) => {
  const { id } = req.params;
  const ref = req.body.paymentReference || `REF-PAY-${Date.now()}`;

  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(
        `UPDATE orders SET payment_status = 'paid', paid_at = NOW(), payment_reference = ? WHERE id = ? OR order_number = ?`,
        [ref, id, id]
      );
    } catch (err: any) {
      console.warn('[Database] Gagal update pembayaran di MySQL:', err.message);
    }
  }

  const order = memoryOrders.find(o => o.id === id || o.orderNumber === id);
  if (order) {
    order.paymentStatus = 'paid';
    order.paidAt = new Date().toISOString();
    order.paymentReference = ref;
    saveLocalData();
  }

  res.json({ success: true, message: 'Pembayaran berhasil dikonfirmasi lunas!', order });
});

function logPaymentSuccessEmail(order: Order): SentEmailNotification {
  return {
    id: `email-pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recipientEmail: order.buyerEmail,
    recipientName: order.buyerName,
    recipientRole: 'user',
    subject: `E-Ticket Resmi Celebes Event: ${order.eventTitle} (${order.orderNumber})`,
    bodyHtml: `<div style="font-family:'Plus Jakarta Sans',sans-serif;padding:24px;background:#f8fafc;border-radius:16px;">
      <h2 style="color:#2563eb;margin-top:0;">E-Ticket Resmi Terverifikasi Lunas</h2>
      <p>Halo <strong>${order.buyerName}</strong>, pembayaran pesanan tiket Anda telah berhasil diverifikasi dan disetujui oleh Super Admin Pusat.</p>
      <div style="background:#ffffff;padding:16px;border-radius:12px;border:1px solid #e2e8f0;margin:16px 0;">
        <p style="margin:4px 0;"><strong>Nomor Order:</strong> ${order.orderNumber}</p>
        <p style="margin:4px 0;"><strong>Event:</strong> ${order.eventTitle}</p>
        <p style="margin:4px 0;"><strong>Total Pembayaran:</strong> Rp ${order.totalAmount.toLocaleString('id-ID')}</p>
        <p style="margin:4px 0;"><strong>Jumlah Tiket:</strong> ${order.tickets.length} Tiket</p>
      </div>
      <p style="color:#059669;font-weight:700;">Seluruh E-Ticket dan QR Code resmi Anda sekarang telah aktif dan siap digunakan untuk check-in di lokasi acara.</p>
    </div>`,
    type: 'payment_verified',
    sentAt: new Date().toISOString(),
    status: 'delivered',
    sender: 'sistem@celebes-event.com (Finance Desk)',
  };
}

// Verifikasi Pembayaran Manual oleh Super Admin Pusat (Blueprint v3)
app.post('/api/orders/:id/verify-payment', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason, verifiedBy } = req.body;

  const order = memoryOrders.find(o => o.id === id || o.orderNumber === id);
  if (!order) {
    return res.status(404).json({ error: 'Order tidak ditemukan' });
  }

  order.verifiedBy = verifiedBy || 'Super Admin Pusat';
  order.verifiedAt = new Date().toISOString();

  if (status === 'paid') {
    const hargaTiketAsli = order.hargaTiketAsli ?? order.subtotal;
    const potonganKreator = order.potonganKreator ?? Math.round(0.02 * hargaTiketAsli);
    const netPendapatanKreator = order.netPendapatanKreator ?? Math.max(0, hargaTiketAsli - potonganKreator);
    const totalMarginPlatform = (order.platformFee || 2000) + potonganKreator;

    order.paymentStatus = 'paid';
    order.paidAt = new Date().toISOString();
    order.rejectionReason = undefined;
    order.hargaTiketAsli = hargaTiketAsli;
    order.potonganKreator = potonganKreator;
    order.netPendapatanKreator = netPendapatanKreator;
    order.totalMarginPlatform = totalMarginPlatform;

    // Alokasikan dana bersih ke saldo dompet Kreator
    const creator = memoryUsers.find(u => u.id === order.creatorId || u.name === order.creatorName);
    if (creator) {
      creator.walletBalance = (creator.walletBalance || 0) + netPendapatanKreator;
    }

    // Catat log pengiriman surat email E-Ticket
    const payEmail = logPaymentSuccessEmail(order);
    memorySentEmails.unshift(payEmail);

    // Sinyal sinkronisasi laporan finansial tersentralisasi Midtrans (Core API Placeholder)
    console.log(`[Midtrans Centralized Sync] Transaksi manual ${order.orderNumber} disetujui. Lapor: Gross Rp ${order.totalAmount}, Net Kreator Rp ${netPendapatanKreator}, Margin Platform Rp ${totalMarginPlatform}`);
  } else {
    order.paymentStatus = 'payment_rejected';
    order.rejectionReason = rejectionReason || 'Bukti transfer tidak sesuai';

    // Kembalikan kuota tiket ke sistem (revert available slots)
    if (Array.isArray(order.tickets)) {
      for (const t of order.tickets) {
        const ev = memoryEvents.find(e => e.id === order.eventId);
        const tier = ev?.tickets.find(tt => tt.id === t.tierId);
        if (tier && tier.soldCount && tier.soldCount > 0) {
          tier.soldCount = Math.max(0, tier.soldCount - 1);
        }
        if (isMysqlActive && mysqlPool) {
          try {
            await (mysqlPool as any).execute(
              `UPDATE ticket_tiers SET sold_count = GREATEST(0, sold_count - 1) WHERE id = ?`,
              [t.tierId]
            );
          } catch {}
        }
      }
    }
  }

  saveLocalData();

  if (isMysqlActive && mysqlPool) {
    try {
      await (mysqlPool as any).execute(
        `UPDATE orders SET payment_status = ?, verified_at = NOW(), verified_by = ?, rejection_reason = ?, paid_at = IF(? = 'paid', NOW(), paid_at) WHERE id = ? OR order_number = ?`,
        [status, order.verifiedBy, order.rejectionReason || null, status, id, id]
      );
      if (status === 'paid' && order.creatorId) {
        await (mysqlPool as any).execute(
          `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE id = ?`,
          [order.netPendapatanKreator || 0, order.creatorId]
        ).catch(() => {});
      }
    } catch (err: any) {
      console.warn('[Database] Gagal update verifikasi di MySQL:', err.message);
    }
  }

  res.json({ 
    success: true, 
    order,
    message: status === 'paid' 
      ? 'Pembayaran berhasil disetujui! Saldo bersih dialokasikan ke kreator dan E-Ticket resmi telah aktif.' 
      : 'Pembayaran ditolak dan kuota tiket telah dikembalikan ke sistem.' 
  });
});

// ==========================================
// MODUL PEMERIKSAAN & INTEGRASI REAL MIDTRANS
// ==========================================

// 1. Uji Validasi Server Key Midtrans Langsung ke Server Midtrans
app.post('/api/midtrans/test-connection', async (req: Request, res: Response) => {
  const customKey = req.body.serverKey ? String(req.body.serverKey).trim() : '';
  const config = getMidtransConfig();
  const serverKeyToTest = customKey || config.serverKey;
  const isProd = req.body.isSandbox !== undefined ? !req.body.isSandbox : config.isProduction;

  if (!serverKeyToTest) {
    return res.status(400).json({
      success: false,
      message: 'Kunci Midtrans (Server Key) belum dimasukkan! Masukkan Server Key akun Midtrans Anda (Contoh: SB-Mid-server-xxxx untuk Sandbox atau Mid-server-xxxx untuk Production).',
    });
  }

  const apiBase = isProd ? 'https://api.midtrans.com/v2' : 'https://api.sandbox.midtrans.com/v2';
  const authHeader = `Basic ${Buffer.from(serverKeyToTest + ':').toString('base64')}`;

  try {
    // Probe order status check with test ID.
    // If auth fails -> Midtrans returns HTTP 401 with Access Denied.
    // If auth succeeds -> Midtrans returns HTTP 404 (Transaction doesn't exist) which PROVES credentials authenticate successfully!
    const testOrderId = `CELEBES-PING-${Date.now()}`;
    const midtransRes = await fetch(`${apiBase}/${testOrderId}/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    let data: any = {};
    try {
      data = await midtransRes.json();
    } catch {
      data = { raw: await midtransRes.text().catch(() => '') };
    }

    if (midtransRes.status === 401 || data.status_code === '401') {
      return res.status(401).json({
        success: false,
        environment: isProd ? 'Production (Live)' : 'Sandbox (Uji Coba)',
        message: `Kredensial DITOLAK oleh Midtrans (401 Unauthorized): ${data.status_message || 'Server Key tidak cocok atau belum aktif'}. Pastikan Server Key Anda sesuai dengan mode ${isProd ? 'Production' : 'Sandbox'}.`,
        details: data,
      });
    }

    if (midtransRes.status === 404 || midtransRes.status === 200 || data.status_code === '404' || data.status_code === '200') {
      return res.json({
        success: true,
        environment: isProd ? 'Production (Live)' : 'Sandbox (Uji Coba)',
        message: `Koneksi ke Midtrans BERHASIL TERVERIFIKASI! Server Key Anda sah dan terautentikasi langsung oleh Midtrans (${isProd ? 'Production Mode' : 'Sandbox Mode'}). Modul pembayaran siap menerima transaksi.`,
        serverKeyPreview: serverKeyToTest.slice(0, 8) + '...' + serverKeyToTest.slice(-4),
        details: data,
      });
    }

    return res.json({
      success: true,
      environment: isProd ? 'Production' : 'Sandbox',
      message: `Terhubung ke Midtrans API (HTTP ${midtransRes.status}).`,
      details: data,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Gagal menghubungi server Midtrans: ${err.message || 'Koneksi jaringan terputus'}. Periksa koneksi internet Anda.`,
    });
  }
});

// 2. Buat Transaksi Midtrans Snap
app.post('/api/midtrans/create-transaction', async (req: Request, res: Response) => {
  const { orderId, orderNumber, grossAmount, buyerName, buyerEmail, buyerPhone, items } = req.body;
  const config = getMidtransConfig();

  if (!config.hasServerKey) {
    return res.json({
      success: true,
      mode: 'simulator',
      token: null,
      redirectUrl: null,
      message: 'Server Key Midtrans belum dikonfigurasi. Menggunakan QRIS Dinamis Internal platform.',
    });
  }

  const authHeader = `Basic ${Buffer.from(config.serverKey + ':').toString('base64')}`;
  const snapUrl = `${config.snapBaseUrl}/transactions`;

  try {
    // Blueprint v3: Spesifikasi Payload API Pemesanan (Checkout)
    // - gross_amount = totalAmount (hargaTiketAsli + biaya admin Rp 2.000)
    // - item_details = tiket asli + item "ADMIN-FEE" (Rp 2.000)
    // - custom_expiry = 15 menit
    let formattedItems: any[] = [];
    if (Array.isArray(items) && items.length > 0) {
      formattedItems = items.map((it: any) => ({
        id: String(it.id || 'TIKET-BASE').slice(0, 50),
        price: Math.round(Number(it.price) || 0),
        quantity: Math.max(1, Number(it.quantity) || 1),
        name: String(it.name || 'Tiket Event').slice(0, 50),
      }));

      const hasAdminFee = formattedItems.some(it => it.id === 'ADMIN-FEE' || String(it.name).toLowerCase().includes('biaya admin'));
      if (!hasAdminFee) {
        formattedItems.push({
          id: 'ADMIN-FEE',
          price: 2000,
          quantity: 1,
          name: 'Biaya Admin Platform',
        });
      }
    } else {
      const grossVal = Math.round(Number(grossAmount) || 102000);
      formattedItems = [
        {
          id: 'TIKET-BASE',
          price: Math.max(0, grossVal - 2000),
          quantity: 1,
          name: 'Tiket Event (Harga Asli)',
        },
        {
          id: 'ADMIN-FEE',
          price: 2000,
          quantity: 1,
          name: 'Biaya Admin Platform',
        },
      ];
    }

    const calculatedGross = formattedItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);

    const payload = {
      transaction_details: {
        order_id: orderNumber || `CE-${Date.now()}`,
        gross_amount: calculatedGross,
      },
      item_details: formattedItems,
      customer_details: {
        first_name: buyerName || 'Pelanggan Celebes',
        email: buyerEmail || 'buyer@example.com',
        phone: buyerPhone || '081234567890',
      },
      custom_expiry: {
        expiry_duration: 15,
        unit: 'minute',
      },
    };

    const midtransRes = await fetch(snapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data: any = await midtransRes.json();
    if (midtransRes.ok && data.token) {
      return res.json({
        success: true,
        mode: 'midtrans_snap',
        token: data.token,
        redirectUrl: data.redirect_url,
        environment: config.isProduction ? 'production' : 'sandbox',
        clientKey: config.clientKey,
        payload,
      });
    } else {
      return res.status(400).json({
        success: false,
        mode: 'error',
        message: data.error_messages ? data.error_messages.join(', ') : (data.status_message || 'Gagal membuat sesi transaksi Midtrans'),
        details: data,
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal menghubungi Midtrans Snap: ' + err.message,
    });
  }
});

// 3. Periksa Status Pembayaran Order ke Midtrans (Poll / Cek Status Tombol)
app.get('/api/midtrans/status/:orderNumber', async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const config = getMidtransConfig();

  const order = memoryOrders.find(o => o.orderNumber === orderNumber || o.id === orderNumber);

  if (!config.hasServerKey) {
    if (order) {
      return res.json({
        isPaid: order.paymentStatus === 'paid',
        status: order.paymentStatus,
        order,
        message: order.paymentStatus === 'paid' ? 'Pembayaran terkonfirmasi LUNAS.' : 'Status pesanan saat ini: ' + order.paymentStatus,
      });
    }
    return res.status(404).json({ error: 'Order tidak ditemukan' });
  }

  const authHeader = `Basic ${Buffer.from(config.serverKey + ':').toString('base64')}`;
  const statusUrl = `${config.apiBaseUrl}/${orderNumber}/status`;

  try {
    const midtransRes = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    const data: any = await midtransRes.json();
    const trxStatus = data.transaction_status;
    const fraudStatus = data.fraud_status;

    let isPaid = false;
    if (trxStatus === 'settlement' || (trxStatus === 'capture' && fraudStatus === 'accept')) {
      isPaid = true;
    }

    if (order && isPaid && order.paymentStatus !== 'paid') {
      const hargaTiketAsli = order.hargaTiketAsli ?? order.subtotal;
      const potonganKreator = order.potonganKreator ?? Math.round(0.02 * hargaTiketAsli);
      const netPendapatanKreator = order.netPendapatanKreator ?? Math.max(0, hargaTiketAsli - potonganKreator);
      const totalMarginPlatform = (order.platformFee || 2000) + potonganKreator;

      order.paymentStatus = 'paid';
      order.paidAt = new Date().toISOString();
      order.paymentReference = data.transaction_id || data.payment_type || 'MIDTRANS-SETTLEMENT';
      order.hargaTiketAsli = hargaTiketAsli;
      order.potonganKreator = potonganKreator;
      order.netPendapatanKreator = netPendapatanKreator;
      order.totalMarginPlatform = totalMarginPlatform;

      // Alokasikan dana bersih ke saldo Kreator
      const creator = memoryUsers.find(u => u.id === order.creatorId || u.name === order.creatorName);
      if (creator) {
        creator.walletBalance = (creator.walletBalance || 0) + netPendapatanKreator;
      }

      // Catat log email E-Ticket
      const payEmail = logPaymentSuccessEmail(order);
      memorySentEmails.unshift(payEmail);

      saveLocalData();

      if (isMysqlActive && mysqlPool) {
        try {
          await (mysqlPool as any).execute(
            `UPDATE orders SET payment_status = 'paid', paid_at = NOW(), payment_reference = ? WHERE order_number = ? OR id = ?`,
            [order.paymentReference, orderNumber, order.id]
          );
          if (order.creatorId) {
            await (mysqlPool as any).execute(
              `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE id = ?`,
              [netPendapatanKreator, order.creatorId]
            ).catch(() => {});
          }
        } catch {}
      }
    }

    return res.json({
      isPaid,
      status: order ? order.paymentStatus : (isPaid ? 'paid' : trxStatus || 'unknown'),
      midtransStatus: trxStatus || null,
      message: isPaid 
        ? 'Pembayaran berhasil TERDETEKSI LUNAS dari Midtrans! E-Ticket resmi telah aktif.' 
        : `Status Midtrans saat ini: ${trxStatus || 'Belum ada pembayaran'}.`,
      order,
      details: data,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Gagal memeriksa status ke Midtrans: ' + err.message,
      isPaid: order?.paymentStatus === 'paid',
      status: order?.paymentStatus || 'unknown',
    });
  }
});

// 4. Shared Webhook Notifikasi Midtrans (Sesuai Blueprint v3 Halaman 4 & 5)
async function processMidtransNotification(req: Request, res: Response) {
  const notification = req.body;
  const config = getMidtransConfig();
  const serverKey = config.serverKey;

  // 1. Validasi Keamanan Signature Key (sesuai Blueprint Halaman 4)
  if (serverKey && notification.signature_key) {
    const stringToHash = `${notification.order_id || ''}${notification.status_code || ''}${notification.gross_amount || ''}${serverKey}`;
    const calculatedSignature = crypto.createHash('sha512').update(stringToHash).digest('hex');
    if (notification.signature_key !== calculatedSignature) {
      console.warn('[Midtrans Webhook] Invalid Signature Key:', notification.signature_key, 'vs calculated:', calculatedSignature);
      return res.status(401).json({ message: "Invalid Signature Key" });
    }
  }

  const orderNumber = notification.order_id;
  const trxStatus = notification.transaction_status;
  const fraudStatus = notification.fraud_status;
  const paymentType = notification.payment_type;
  const transactionId = notification.transaction_id;

  console.log(`[Midtrans Webhook] Menerima notifikasi untuk order ${orderNumber}: status = ${trxStatus}, fraud = ${fraudStatus}`);

  const order = memoryOrders.find(o => o.orderNumber === orderNumber || o.id === orderNumber);
  if (!order) {
    return res.status(200).send('OK');
  }

  // 3. Evaluasi Status Pembayaran Lunas (settlement || capture)
  if (trxStatus === 'settlement' || (trxStatus === 'capture' && fraudStatus === 'accept')) {
    if (order.paymentStatus !== 'paid') {
      const hargaTiketAsli = order.hargaTiketAsli ?? order.subtotal;
      const potonganKreator = order.potonganKreator ?? Math.round(0.02 * hargaTiketAsli);
      const netPendapatanKreator = order.netPendapatanKreator ?? Math.max(0, hargaTiketAsli - potonganKreator);
      const totalMarginPlatform = (order.platformFee || 2000) + potonganKreator;

      order.paymentStatus = 'paid';
      order.paidAt = new Date().toISOString();
      order.paymentReference = transactionId || paymentType || 'MIDTRANS-WEBHOOK';
      order.hargaTiketAsli = hargaTiketAsli;
      order.potonganKreator = potonganKreator;
      order.netPendapatanKreator = netPendapatanKreator;
      order.totalMarginPlatform = totalMarginPlatform;

      // Alokasikan dana bersih ke saldo dompet Kreator (Blueprint Halaman 4)
      const creator = memoryUsers.find(u => u.id === order.creatorId || u.name === order.creatorName);
      if (creator) {
        creator.walletBalance = (creator.walletBalance || 0) + netPendapatanKreator;
      }

      // Kirim E-Tiket ke pengguna (log notifikasi)
      const payEmail = logPaymentSuccessEmail(order);
      memorySentEmails.unshift(payEmail);

      saveLocalData();

      if (isMysqlActive && mysqlPool) {
        try {
          await (mysqlPool as any).execute(
            `UPDATE orders SET payment_status = 'paid', paid_at = NOW(), payment_reference = ? WHERE order_number = ? OR id = ?`,
            [transactionId || 'MIDTRANS', orderNumber, order.id]
          );
          if (order.creatorId) {
            await (mysqlPool as any).execute(
              `UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + ? WHERE id = ?`,
              [netPendapatanKreator, order.creatorId]
            ).catch(() => {});
          }
        } catch (err: any) {
          console.warn('[Database] Gagal update notifikasi webhook di MySQL:', err.message);
        }
      }
    }
  } 
  // 4. Evaluasi Status Gagal / Kedaluwarsa (expire, cancel, deny) (Blueprint Halaman 4)
  else if (['expire', 'cancel', 'deny'].includes(trxStatus)) {
    if (order.paymentStatus !== 'payment_rejected') {
      order.paymentStatus = 'payment_rejected';
      order.rejectionReason = `Transaksi ${trxStatus} di Midtrans`;

      // Kembalikan kuota tiket ke sistem (revert available slots)
      if (Array.isArray(order.tickets)) {
        for (const t of order.tickets) {
          const ev = memoryEvents.find(e => e.id === order.eventId);
          const tier = ev?.tickets.find(tt => tt.id === t.tierId);
          if (tier && tier.soldCount && tier.soldCount > 0) {
            tier.soldCount = Math.max(0, tier.soldCount - 1);
          }
          if (isMysqlActive && mysqlPool) {
            try {
              await (mysqlPool as any).execute(
                `UPDATE ticket_tiers SET sold_count = GREATEST(0, sold_count - 1) WHERE id = ?`,
                [t.tierId]
              );
            } catch {}
          }
        }
      }

      saveLocalData();

      if (isMysqlActive && mysqlPool) {
        try {
          await (mysqlPool as any).execute(
            `UPDATE orders SET payment_status = 'payment_rejected', rejection_reason = ? WHERE order_number = ? OR id = ?`,
            [`Midtrans ${trxStatus}`, orderNumber, order.id]
          );
        } catch (err: any) {
          console.warn('[Database] Gagal update rejected di MySQL:', err.message);
        }
      }
    }
  }

  // Blueprint Page 5: res.status(200).send('OK');
  return res.status(200).send('OK');
}

// Endpoint webhook sesuai dokumen spesifikasi Blueprint (Page 4) & Midtrans standard
app.post('/api/midtrans-webhook', processMidtransNotification);
app.post('/api/midtrans/notification', processMidtransNotification);

// 5. Core API Placeholder untuk Sinkronisasi Pembukuan Transaksi Manual
app.post('/api/midtrans/sync-manual', async (req: Request, res: Response) => {
  const { orderNumber, grossAmount, note } = req.body;
  const config = getMidtransConfig();
  console.log(`[Midtrans Core API Placeholder] Menyelaraskan pembukuan transfer manual ${orderNumber} (Gross: Rp ${grossAmount}) ke laporan tersentralisasi Midtrans.`);
  
  res.json({
    success: true,
    synced: true,
    channel: 'manual_core_api_placeholder',
    orderNumber,
    grossAmount,
    timestamp: new Date().toISOString(),
    message: 'Pembukuan transaksi transfer manual berhasil disinkronkan ke pelaporan tersentralisasi Midtrans.',
  });
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

app.delete('/api/payouts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(`DELETE FROM payout_requests WHERE id = ?`, [id]);
    } catch (err: any) {
      console.warn('[Database] Gagal delete payout dari MySQL:', err.message);
    }
  }
  memoryPayouts = memoryPayouts.filter(p => p.id !== id);
  saveLocalData();
  res.json({ success: true, message: 'Data pengajuan payout berhasil dihapus' });
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

  // 1. Super Admin Match (Strict Environment Variables Verification)
  const { email: superAdminEmail, password: superAdminPassword, name: superAdminName } = getSuperAdminCredentials();

  if (cleanEmail === superAdminEmail || cleanEmail === 'redaksibergulircom@gmail.com' || cleanEmail === 'mirza.tomini@gmail.com') {
    const adminUser = users.find(u => u.role === 'admin' && (u.email.toLowerCase() === cleanEmail || u.id === 'usr-admin-bergulir')) || users[0];
    
    // Strict password verification:
    // Only accept the password set in Environment Variables (.env SUPERADMIN_PASSWORD) or DB hash
    const isValidAdminPassword = (password === superAdminPassword) || (adminUser && adminUser.password && adminUser.password === password);

    if (!isValidAdminPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Password Super Admin salah! Pastikan password sesuai dengan variabel SUPERADMIN_PASSWORD di file .env server Anda.' 
      });
    }

    const safeAdminUser = {
      ...adminUser,
      email: superAdminEmail,
      name: superAdminName || adminUser.name,
    };
    delete safeAdminUser.password;

    return res.json({ 
      success: true, 
      user: safeAdminUser, 
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

app.delete('/api/support-tickets/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isMysqlActive && mysqlPool) {
    try {
      await mysqlPool.execute(`DELETE FROM support_tickets WHERE id = ?`, [id]);
    } catch (err: any) {
      console.warn('[Database] Gagal delete support ticket dari MySQL:', err.message);
    }
  }
  memorySupportTickets = memorySupportTickets.filter(t => t.id !== id);
  saveLocalData();
  res.json({ success: true, message: 'Tiket bantuan berhasil dihapus' });
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

// 12. Berita & Informasi Event Indonesia (Super Admin Managed)
app.get('/api/news', (req: Request, res: Response) => {
  const { category, all, search } = req.query;
  let results = [...memoryNews];

  if (all !== 'true') {
    results = results.filter(n => n.status === 'published');
  }

  if (category && category !== 'Semua') {
    results = results.filter(n => n.category.toLowerCase() === String(category).toLowerCase());
  }

  if (search) {
    const q = String(search).toLowerCase();
    results = results.filter(n => 
      n.title.toLowerCase().includes(q) || 
      n.summary.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  // Sort: featured first, then publishedAt desc
  results.sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
  });

  res.json(results);
});

app.get('/api/news/:idOrSlug', (req: Request, res: Response) => {
  const param = req.params.idOrSlug;
  const newsItem = memoryNews.find(n => n.id === param || n.slug === param);
  if (!newsItem) {
    return res.status(404).json({ error: 'Berita tidak ditemukan' });
  }

  // Increment views
  newsItem.viewsCount = (newsItem.viewsCount || 0) + 1;
  saveLocalData();

  res.json(newsItem);
});

app.post('/api/news', (req: Request, res: Response) => {
  const newsData = req.body;
  if (!newsData.title || !newsData.category || !newsData.content) {
    return res.status(400).json({ error: 'Judul, kategori, dan isi berita wajib diisi!' });
  }

  const newId = `news-${Date.now()}`;
  const slug = newsData.slug || newsData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const newNews: EventNews = {
    id: newId,
    title: newsData.title,
    slug,
    category: newsData.category,
    summary: newsData.summary || newsData.content.slice(0, 160) + '...',
    content: newsData.content,
    imageUrl: newsData.imageUrl || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
    author: newsData.author || 'Redaksi Celebes Event',
    authorRole: newsData.authorRole || 'Redaksi Berita & Liputan Event',
    eventDate: newsData.eventDate || '',
    eventLocation: newsData.eventLocation || '',
    readTime: newsData.readTime || '3 menit baca',
    viewsCount: 0,
    isFeatured: Boolean(newsData.isFeatured),
    status: newsData.status || 'published',
    tags: Array.isArray(newsData.tags) ? newsData.tags : (newsData.tags ? String(newsData.tags).split(',').map((t: string) => t.trim()) : []),
    publishedAt: newsData.publishedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  memoryNews.unshift(newNews);
  saveLocalData();
  res.status(201).json(newNews);
});

app.put('/api/news/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  const index = memoryNews.findIndex(n => n.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Berita tidak ditemukan' });
  }

  memoryNews[index] = {
    ...memoryNews[index],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  saveLocalData();
  res.json(memoryNews[index]);
});

app.delete('/api/news/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  memoryNews = memoryNews.filter(n => n.id !== id);
  saveLocalData();
  res.json({ success: true, message: 'Berita berhasil dihapus' });
});

// ==========================================
// STATIC FILES & VITE MIDDLEWARES
// ==========================================

async function startServer() {
  function findCompiledProductionHtml(): string | null {
    const candidates = [
      path.resolve(APP_ROOT, 'dist', 'index.html'),
      path.resolve(detectedDir, 'dist', 'index.html'),
      path.resolve(process.cwd(), 'dist', 'index.html'),
      path.resolve('./dist/index.html'),
      path.resolve(APP_ROOT, 'public', 'index.html'),
      path.resolve(detectedDir, 'public', 'index.html'),
      path.resolve(process.cwd(), 'public', 'index.html'),
      path.resolve(APP_ROOT, 'index.html'),
      path.resolve(detectedDir, 'index.html'),
      path.resolve(process.cwd(), 'index.html'),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        try {
          const content = fs.readFileSync(c, 'utf8');
          // Valid production HTML must link to built assets and NOT require unbundled /src/main.tsx
          if (!content.includes('/src/main.tsx') && !content.includes('src/main.tsx')) {
            return c;
          }
        } catch {}
      }
    }
    return null;
  }

  const productionHtml = findCompiledProductionHtml();
  const distDir = productionHtml ? path.dirname(productionHtml) : path.resolve(APP_ROOT, 'dist');

  const assetCandidateDirs = [
    path.resolve(distDir, 'assets'),
    path.resolve(APP_ROOT, 'dist', 'assets'),
    path.resolve(detectedDir, 'dist', 'assets'),
    path.resolve(APP_ROOT, 'public', 'assets'),
    path.resolve(detectedDir, 'public', 'assets'),
    path.resolve(process.cwd(), 'public', 'assets'),
    path.resolve(APP_ROOT, 'assets'),
    path.resolve(detectedDir, 'assets'),
    path.resolve(process.cwd(), 'assets'),
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
  app.get('/assets/:file', (req: Request, res: Response) => {
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
    // Block uncompiled /src/* direct requests in production
    app.get('/src/*', (_req: Request, res: Response) => {
      res.status(404).type('text/plain').send('Akses langsung ke berkas mentah /src/* diblokir dalam mode produksi. Gunakan aset dist/ yang telah terkompilasi.');
    });

    // Serve static root files from distDir
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
    }

    app.get('*', (_req: Request, res: Response) => {
      const validHtmlPath = findCompiledProductionHtml();
      if (validHtmlPath) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return res.sendFile(validHtmlPath);
      }

      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Celebes Event - Status Server Hosting</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
              .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px; max-width: 540px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); text-align: left; }
              h2 { color: #38bdf8; margin-top: 0; font-size: 20px; text-align: center; }
              p { color: #94a3b8; line-height: 1.6; font-size: 13px; }
              .badge { display: inline-block; background: #059669; color: #fff; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; }
              .code { background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #38bdf8; margin: 16px 0; }
              .warn { background: #451a03; border: 1px solid #78350f; color: #fde68a; padding: 12px; border-radius: 8px; font-size: 12px; line-height: 1.5; margin: 14px 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <div style="text-align: center;"><span class="badge">Node.js Server Berjalan Normal</span></div>
              <h2>Celebes Event Siap Tayang</h2>
              <div class="warn">
                <strong>Pemberitahuan Pemasangan:</strong><br>
                Backend Node.js telah aktif, namun folder tampilan frontend produksi (<code>dist/</code> atau <code>public/index.html</code>) belum ditemukan di hosting.
              </div>
              <p>Untuk mengaktifkan tampilan visual, lakukan salah satu langkah mudah berikut:</p>
              <div class="code">
                # Opsi 1 (Melalui Terminal cPanel):<br>
                <strong>npm run build</strong>
              </div>
              <p>Atau unduh paket siap pakai <code>celebesevent-siap-tayang-root.zip</code> dan ekstrak langsung ke direktori hosting Anda.</p>
            </div>
          </body>
        </html>
      `);
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
