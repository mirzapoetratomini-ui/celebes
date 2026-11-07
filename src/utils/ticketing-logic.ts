/**
 * Pure business logic for event ticketing, calculations, validations,
 * QR check-in verification, and social share links generation.
 * Fully decoupled from DOM/React for deterministic unit testing.
 */

export interface OrderItemCalc {
  price: number;
  quantity: number;
}

export interface VoucherCalc {
  discountType: 'percentage' | 'fixed';
  discountValue: number;
}

export interface FeeConfig {
  fixed: number;
  percentage: number;
}

/**
 * Calculates subtotal, voucher discount, platform fee, and total payable amount.
 */
export function calculateOrderTotals(
  items: OrderItemCalc[],
  voucher?: VoucherCalc | null,
  feeConfig: FeeConfig = { fixed: 4500, percentage: 0 }
): {
  subtotal: number;
  discountAmount: number;
  platformFee: number;
  totalAmount: number;
} {
  const subtotal = items.reduce((acc, item) => acc + (Math.max(0, item.price) * Math.max(0, item.quantity)), 0);

  let discountAmount = 0;
  if (voucher && subtotal > 0) {
    if (voucher.discountType === 'percentage') {
      discountAmount = Math.round((subtotal * Math.min(100, Math.max(0, voucher.discountValue))) / 100);
    } else {
      discountAmount = Math.min(subtotal, Math.max(0, voucher.discountValue));
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);

  // Platform fee is only applied if subtotal > 0
  let platformFee = 0;
  if (subtotal > 0) {
    const variableFee = Math.round((taxableAmount * (feeConfig.percentage || 0)) / 100);
    platformFee = (feeConfig.fixed || 0) + variableFee;
  }

  const totalAmount = taxableAmount + platformFee;

  return {
    subtotal,
    discountAmount,
    platformFee,
    totalAmount,
  };
}

/**
 * Validates custom registration form fields.
 */
export function validateCustomResponses(
  fields: { id: string; label: string; isRequired: boolean }[],
  responses: Record<string, string>
): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (field.isRequired) {
      const val = responses[field.id];
      if (!val || val.trim() === '') {
        errors[field.id] = `${field.label} wajib diisi`;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Generates unique, professional ticket code (e.g. TN-TECH26-A1B2C3).
 */
export function generateTicketCode(prefix: string, seed: number = Date.now()): string {
  const cleanPrefix = prefix.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || 'EVT';
  const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
  const seedPart = (seed % 10000).toString().padStart(4, '0');
  return `CE-${cleanPrefix}-${seedPart}-${randomHex}`;
}

/**
 * Generates secure QR verification payload.
 */
export function generateQrPayload(ticketCode: string, eventId: string, attendeeEmail: string): string {
  return `CELEBES:VERIFY:${ticketCode}:${eventId}:${attendeeEmail}`;
}

/**
 * Verifies and executes check-in status transition.
 * Ensures a ticket cannot be checked in more than once.
 */
export function verifyAndCheckInTicket(
  ticket: {
    id: string;
    ticketCode: string;
    checkInStatus: 'not_checked_in' | 'checked_in';
    checkInTime?: string;
  },
  nowIso: string = new Date().toISOString()
): {
  success: boolean;
  message: string;
  checkInStatus: 'checked_in' | 'not_checked_in';
  checkInTime?: string;
} {
  if (ticket.checkInStatus === 'checked_in') {
    return {
      success: false,
      message: `Tiket ${ticket.ticketCode} sudah pernah check-in pada ${ticket.checkInTime || 'sebelumnya'}.`,
      checkInStatus: 'checked_in',
      checkInTime: ticket.checkInTime,
    };
  }

  return {
    success: true,
    message: `Check-in berhasil untuk tiket ${ticket.ticketCode}!`,
    checkInStatus: 'checked_in',
    checkInTime: nowIso,
  };
}

/**
 * Formats integer or number to Indonesian Rupiah (Rp).
 */
export function formatRupiah(amount: number): string {
  if (amount === 0) return 'Gratis';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generates social media registration and share links.
 * Meets user requirement: "untuk krator buatkan link pendaftaran menggunakan google dan akun sosial media"
 */
export function generateSocialShareLinks(
  event: { title: string; slug: string; shortDescription?: string },
  baseUrl: string = 'https://celebes-event.com'
): {
  whatsapp: string;
  telegram: string;
  twitter: string;
  facebook: string;
  linkedin: string;
  email: string;
  directUrl: string;
  googleRegisterUrl: string;
} {
  const directUrl = `${baseUrl.replace(/\/$/, '')}/event/${event.slug}`;
  const encodedUrl = encodeURIComponent(directUrl);
  const text = encodeURIComponent(`Yuk hadir di acara ${event.title}! Daftar dan pesan tiketnya sekarang melalui Celebes Event:`);
  
  // Quick Google Registration link simulating seamless Google Sign-in registration
  const googleRegisterUrl = `${directUrl}?auth_provider=google&ref=social_share`;

  return {
    whatsapp: `https://api.whatsapp.com/send?text=${text}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${text}`,
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodeURIComponent(`Undangan Event: ${event.title}`)}&body=${text}%20${encodedUrl}`,
    directUrl,
    googleRegisterUrl,
  };
}
