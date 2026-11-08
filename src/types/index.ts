export type UserRole = 'admin' | 'creator' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  phone?: string;
  organization?: string;
  category?: string;
  city?: string;
  bio?: string;
  instagram?: string;
  portfolioUrl?: string;
  authProvider?: 'local' | 'google' | 'facebook' | 'twitter';
  auth_provider?: 'local' | 'google' | 'facebook' | 'twitter';
  status: 'active' | 'pending_approval' | 'suspended';
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  walletBalance?: number;
  createdAt: string;
}

export type EventLocationType = 'venue' | 'online' | 'hybrid';
export type EventStatus = 'published' | 'draft' | 'pending_approval' | 'ended' | 'cancelled';

export interface TicketTier {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  price: number;
  quota: number;
  soldCount: number;
  maxPerOrder: number;
  isActive: boolean;
}

export type CustomFieldType = 'text' | 'number' | 'email' | 'phone' | 'dropdown' | 'checkbox' | 'textarea';

export interface CustomFormField {
  id: string;
  eventId: string;
  label: string;
  fieldType: CustomFieldType;
  placeholder?: string;
  options?: string[];
  isRequired: boolean;
  orderIndex: number;
}

export interface EventItem {
  id: string;
  creatorId: string;
  creatorName?: string;
  creatorAvatar?: string;
  title: string;
  slug: string;
  category: string;
  bannerImage: string;
  shortDescription: string;
  description: string;
  startDate: string;
  endDate: string;
  locationType: EventLocationType;
  venueName?: string;
  venueAddress?: string;
  onlineMeetingUrl?: string;
  status: EventStatus;
  isFeatured: boolean;
  registrationLimit: number;
  socialShareSlug: string;
  tickets: TicketTier[];
  customFields: CustomFormField[];
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethod = 'qris' | 'bank_transfer' | 'virtual_account' | 'credit_card' | 'free' | 'bank_transfer_manual';
export type PaymentStatus = 'pending' | 'pending_manual_verification' | 'paid' | 'payment_rejected' | 'expired' | 'cancelled' | 'refunded';
export type TicketTemplateType = 'modern' | 'festival' | 'corporate' | 'vintage';

export interface AttendeeInput {
  name: string;
  email: string;
  phone: string;
  tierId: string;
  responses: Record<string, string>; // fieldId -> answer
}

export interface AttendeeResponse {
  id: string;
  ticketId: string;
  fieldId: string;
  fieldLabel: string;
  responseValue: string;
}

export interface Ticket {
  id: string;
  orderId: string;
  eventId: string;
  eventTitle?: string;
  tierId: string;
  tierName: string;
  ticketCode: string;
  qrPayload: string;
  attendeeName: string;
  attendeeEmail: string;
  checkInStatus: 'not_checked_in' | 'checked_in';
  checkInTime?: string;
  responses?: AttendeeResponse[];
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  subtotal: number;
  discountAmount: number;
  platformFee: number;
  totalAmount: number;
  paymentType?: 'automatic' | 'manual';
  paymentMethod: PaymentMethod;
  paymentChannel?: string;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  paymentProofUrl?: string;
  senderBank?: string;
  senderAccountName?: string;
  transferNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  creatorId?: string;
  creatorName?: string;
  hargaTiketAsli?: number;
  biayaAdminUser?: number;
  potonganKreator?: number;
  netPendapatanKreator?: number;
  totalMarginPlatform?: number;
  tickets: Ticket[];
  createdAt: string;
  paidAt?: string;
}

export interface Voucher {
  id: string;
  eventId?: string | null;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  quota: number;
  usedCount: number;
  isActive: boolean;
  validUntil?: string;
}

export interface PlatformFeeConfig {
  feeType: 'percentage' | 'fixed' | 'percentage_plus_fixed';
  percentageValue: number; // e.g. 2 for 2%
  fixedValue: number; // e.g. 2000 for Rp 2.000
  description?: string;
}

export interface PayoutRequest {
  id: string;
  creatorId: string;
  creatorName: string;
  eventId: string;
  eventTitle: string;
  grossAmount?: number; // Total omzet kotor penjualan
  platformFeeDeduction?: number; // Potongan biaya platform aplikasi
  feeBreakdownText?: string; // e.g. "Potongan platform 2% (-Rp 50.000)"
  netAmount?: number; // Bersih yang diterima kreator
  amount: number; // Nilai penarikan bersih
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
  processedAt?: string;
}

export interface DatabaseStatus {
  isConfigured: boolean;
  mode: 'mysql' | 'memory-resilient';
  host: string;
  database: string;
  user: string;
  connected: boolean;
  latencyMs?: number;
  tableCounts: Record<string, number>;
  message: string;
}

export interface PlatformSocialLinks {
  instagram?: string;
  whatsapp?: string;
  tiktok?: string;
  youtube?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
}

export interface QrisApiConfig {
  provider: 'midtrans' | 'xendit' | 'doku' | 'bi_qris' | 'manual';
  merchantId: string;
  clientKey: string;
  serverKey: string;
  isSandbox: boolean;
  isEnabled: boolean;
  webhookUrl?: string;
}

export interface HowToStepItem {
  stepNumber: number;
  title: string;
  description: string;
  badge?: string;
  iconName?: string;
}

export interface AboutUsContent {
  title: string;
  subtitle: string;
  story: string;
  vision: string;
  mission: string;
  highlights?: { label: string; value: string }[];
  metrics?: { label: string; value: string }[];
}

export interface ServicePackage {
  id?: string;
  packageNumber?: number;
  name: string;
  tagline?: string;
  tag?: string;
  price?: string;
  priceDisplay?: string; // e.g. "Rp500.000", "2%", "Rp2.000.000"
  priceSub?: string;
  unitDisplay?: string; // e.g. "/event", "/tiket"
  badge?: string;
  description?: string;
  note?: string;
  conditionNote?: string;
  featuresIncluded: string[];
  organizerPrepared?: string[];
  featuresPreparedByOrganizer?: string[];
  isPopular?: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  date?: string;
}

export interface PlatformSettings {
  platformName: string;
  tagline: string;
  description: string;
  logoUrl: string;
  primaryColor?: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  socialLinks: PlatformSocialLinks;
  heroHeadline: string;
  heroSubheadline: string;
  heroBannerImage: string;
  announcementText?: string;
  qrisConfig: QrisApiConfig;
  feeConfig: PlatformFeeConfig;
  howToSteps: HowToStepItem[];
  aboutUs: AboutUsContent;
  servicePackages: ServicePackage[];
  gallery: GalleryItem[];
  manualBankAccounts?: ManualBankAccount[];
}

export interface ManualBankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isActive: boolean;
  notes?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  name: string;
  email: string;
  phone?: string;
  category: 'pembayaran' | 'tiket' | 'event' | 'akun' | 'lainnya';
  priority: 'rendah' | 'sedang' | 'tinggi';
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  adminReply?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface SentEmailNotification {
  id: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: UserRole;
  subject: string;
  bodyHtml: string;
  type: 'creator_approved' | 'creator_registered' | 'payment_verified' | 'general';
  sentAt: string;
  status: 'delivered' | 'failed';
  sender: string;
}

export interface NationalEventLink {
  id: string;
  title: string;
  province: string;
  city: string;
  category: string;
  organizer: string;
  eventDate: string;
  bannerUrl: string;
  externalUrl: string;
  ctaLabel: string;
  badge: string;
  description: string;
  isActive: boolean;
  orderIndex: number;
  createdAt: string;
}

export type NewsCategory = 
  | 'Event Musik & Konser'
  | 'Event Olahraga'
  | 'Running & Marathon'
  | 'Festival Budaya & Wisata'
  | 'Pameran & Konferensi'
  | 'Informasi & Tips Event';

export interface EventNews {
  id: string;
  title: string;
  slug: string;
  category: NewsCategory;
  summary: string;
  content: string;
  imageUrl: string;
  author: string;
  authorRole?: string;
  eventDate?: string;
  eventLocation?: string;
  readTime: string;
  viewsCount: number;
  isFeatured: boolean;
  status: 'published' | 'draft';
  tags: string[];
  publishedAt: string;
  createdAt: string;
  updatedAt?: string;
}



