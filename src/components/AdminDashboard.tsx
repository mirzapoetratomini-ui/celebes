import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Download, 
  DollarSign, 
  Ticket, 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  ExternalLink, 
  Server, 
  RefreshCw, 
  FileCode, 
  Check, 
  Copy,
  Activity,
  Upload,
  Eye,
  Clock,
  X,
  Settings,
  QrCode,
  Headphones,
  MessageSquare,
  Save,
  Globe,
  Image,
  Link as LinkIcon,
  HelpCircle,
  Phone,
  Mail,
  Percent,
  Layers,
  Plus,
  Trash2,
  FileText,
  Newspaper,
  Building2,
  Edit3,
  RotateCcw,
  Receipt,
  Wallet,
  CreditCard,
  Printer,
  ArrowRight
} from 'lucide-react';
import { EventItem, Order, PayoutRequest, User, DatabaseStatus, PlatformSettings, SupportTicket, FaqItem, SentEmailNotification, ManualBankAccount } from '../types';
import { DEFAULT_PLATFORM_SETTINGS } from '../data/seedData';
import { formatRupiah } from '../utils/ticketing-logic';
import { api } from '../services/api';
import { AdminNewsManager } from './AdminNewsManager';

interface AdminDashboardProps {
  currentUser: User;
  events: EventItem[];
  orders: Order[];
  payouts: PayoutRequest[];
  users: User[];
  onRefreshData: () => void;
  platformSettings?: PlatformSettings;
  onUpdatePlatformSettings?: (settings: PlatformSettings) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  events,
  orders,
  payouts,
  users,
  onRefreshData,
  platformSettings,
  onUpdatePlatformSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'users' | 'transactions' | 'manual-payments' | 'payouts' | 'news' | 'database' | 'settings' | 'qris-api' | 'support-desk'>('overview');
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isLoadingDbStatus, setIsLoadingDbStatus] = useState(false);

  // Platform Branding & Settings Form
  const [settingsForm, setSettingsForm] = useState<PlatformSettings>(platformSettings || DEFAULT_PLATFORM_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState<string | null>(null);

  // QRIS API Config
  const [isSavingQris, setIsSavingQris] = useState(false);
  const [qrisTestResult, setQrisTestResult] = useState<string | null>(null);

  // Pusat Bantuan & Support Tickets
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportFilter, setSupportFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [selectedTicketForReply, setSelectedTicketForReply] = useState<SupportTicket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminReplyStatus, setAdminReplyStatus] = useState<'in_progress' | 'resolved'>('resolved');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Manual payment state for Super Admin (Blueprint v3: Approval, Master Data Rekening, & Layanan Input Manual)
  const [adminManualSubTab, setAdminManualSubTab] = useState<'approvals' | 'accounts' | 'input-manual'>('approvals');
  const adminManualOrders = orders.filter(o => o.paymentType === 'manual' || o.paymentMethod === 'bank_transfer_manual');
  const adminPendingCount = adminManualOrders.filter(o => o.paymentStatus === 'pending_manual_verification').length;
  const [adminManualFilter, setAdminManualFilter] = useState<'all' | 'pending' | 'paid' | 'rejected'>('all');
  const [adminPreviewProof, setAdminPreviewProof] = useState<Order | null>(null);
  const [adminRejectOrder, setAdminRejectOrder] = useState<Order | null>(null);
  const [adminRejectReason, setAdminRejectReason] = useState('Nominal transfer tidak sesuai tagihan / mutasi bank belum terdata');
  const [adminActionToast, setAdminActionToast] = useState<string | null>(null);

  // Master Data Rekening State
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [newBankName, setNewBankName] = useState('');
  const [newBankCode, setNewBankCode] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const currentBankAccounts = settingsForm.manualBankAccounts || DEFAULT_PLATFORM_SETTINGS.manualBankAccounts || [];

  const handleSaveBankAccounts = async (updatedAccounts: ManualBankAccount[]) => {
    const updated = {
      ...settingsForm,
      manualBankAccounts: updatedAccounts,
    };
    setSettingsForm(updated);
    try {
      const res = await api.updateSettings({ manualBankAccounts: updatedAccounts });
      if (res.success) {
        onUpdatePlatformSettings?.(res.settings);
        setAdminActionToast('Master data rekening berhasil disimpan dan diperbarui di aplikasi!');
        setTimeout(() => setAdminActionToast(null), 3000);
      }
    } catch (err: any) {
      alert('Gagal menyimpan rekening: ' + err.message);
    }
  };

  const handleAddOrEditBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newAccountNumber.trim() || !newAccountName.trim()) {
      alert('Nama Bank, Nomor Rekening, dan Atas Nama wajib diisi.');
      return;
    }
    if (editingBankId) {
      const updated = currentBankAccounts.map(b => {
        if (b.id === editingBankId) {
          return {
            ...b,
            bankName: newBankName.trim(),
            bankCode: newBankCode.trim().toUpperCase() || 'BANK',
            accountNumber: newAccountNumber.trim(),
            accountName: newAccountName.trim(),
            notes: newNotes.trim() || undefined,
          };
        }
        return b;
      });
      await handleSaveBankAccounts(updated);
    } else {
      const newAccount: ManualBankAccount = {
        id: `bank-${Date.now()}`,
        bankName: newBankName.trim(),
        bankCode: newBankCode.trim().toUpperCase() || 'BANK',
        accountNumber: newAccountNumber.trim(),
        accountName: newAccountName.trim(),
        notes: newNotes.trim() || undefined,
        isActive: true,
      };
      await handleSaveBankAccounts([...currentBankAccounts, newAccount]);
    }
    handleCancelBankForm();
  };

  const handleStartEditBank = (account: ManualBankAccount) => {
    setEditingBankId(account.id);
    setNewBankName(account.bankName);
    setNewBankCode(account.bankCode);
    setNewAccountNumber(account.accountNumber);
    setNewAccountName(account.accountName);
    setNewNotes(account.notes || '');
    setIsAddingBank(true);
  };

  const handleCancelBankForm = () => {
    setIsAddingBank(false);
    setEditingBankId(null);
    setNewBankName('');
    setNewBankCode('');
    setNewAccountNumber('');
    setNewAccountName('');
    setNewNotes('');
  };

  const handleToggleBankAccountActive = async (id: string) => {
    const updated = currentBankAccounts.map(b => (b.id === id ? { ...b, isActive: !b.isActive } : b));
    await handleSaveBankAccounts(updated);
  };

  const handleDeleteBankAccount = async (id: string) => {
    if (!confirm('Hapus rekening bank ini dari master data platform?')) return;
    const updated = currentBankAccounts.filter(b => b.id !== id);
    await handleSaveBankAccounts(updated);
  };

  const handleResetDefaultBankAccounts = async () => {
    if (!confirm('Kembalikan master data ke 3 Rekening Aktif Resmi (Bank BCA 888-019-2831, Bank Mandiri 137-00-19283-912, Bank BSI Syariah 719-283-0012)?')) return;
    const defaultAccounts: ManualBankAccount[] = [
      {
        id: 'bank-bca',
        bankName: 'Bank BCA',
        bankCode: 'bca',
        accountNumber: '888-019-2831',
        accountName: 'PT CELEBES EVENT DIGITAL',
        isActive: true,
        notes: 'Verifikasi via m-BCA, myBCA, KlikBCA, atau ATM BCA',
      },
      {
        id: 'bank-mandiri',
        bankName: 'Bank Mandiri',
        bankCode: 'mandiri',
        accountNumber: '137-00-19283-912',
        accountName: 'CELEBES EVENT INDONESIA',
        isActive: true,
        notes: 'Transfer via Livin by Mandiri atau ATM Mandiri',
      },
      {
        id: 'bank-bsi',
        bankName: 'Bank BSI (Syariah)',
        bankCode: 'bsi',
        accountNumber: '719-283-0012',
        accountName: 'CELEBES EVENT SYARIAH',
        isActive: true,
        notes: 'Transfer syariah via BSI Mobile atau ATM Bersama',
      },
    ];
    await handleSaveBankAccounts(defaultAccounts);
  };

  // Layanan Super Admin Input Transaksi & Tiket Manual State
  const [manualEventId, setManualEventId] = useState<string>('');
  const [manualTierId, setManualTierId] = useState<string>('');
  const [manualQuantity, setManualQuantity] = useState<number>(1);
  const [manualBuyerName, setManualBuyerName] = useState('');
  const [manualBuyerEmail, setManualBuyerEmail] = useState('');
  const [manualBuyerPhone, setManualBuyerPhone] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'transfer_manual' | 'cash_loket' | 'qris_manual'>('transfer_manual');
  const [manualSelectedBankId, setManualSelectedBankId] = useState<string>('bank-bca');
  const [manualSenderBank, setManualSenderBank] = useState('Bank BCA');
  const [manualSenderAccountName, setManualSenderAccountName] = useState('');
  const [manualPaymentRef, setManualPaymentRef] = useState('');
  const [manualTransferNotes, setManualTransferNotes] = useState('');
  const [manualIsImmediatePaid, setManualIsImmediatePaid] = useState<boolean>(true);
  const [isSubmittingManualOrder, setIsSubmittingManualOrder] = useState<boolean>(false);
  const [manualOrderCreatedResult, setManualOrderCreatedResult] = useState<Order | null>(null);

  useEffect(() => {
    if (events.length > 0 && !manualEventId) {
      setManualEventId(events[0].id);
      if (events[0].tickets && events[0].tickets.length > 0) {
        setManualTierId(events[0].tickets[0].id);
      }
    }
  }, [events, manualEventId]);

  useEffect(() => {
    const selEvent = events.find(e => e.id === manualEventId);
    if (selEvent && selEvent.tickets && selEvent.tickets.length > 0) {
      if (!selEvent.tickets.some(t => t.id === manualTierId)) {
        setManualTierId(selEvent.tickets[0].id);
      }
    }
  }, [manualEventId, events, manualTierId]);

  const handleSubmitManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEventId || !manualTierId || !manualBuyerName.trim() || !manualBuyerEmail.trim()) {
      alert('Event, kategori tiket, nama pendaftar, dan email wajib diisi!');
      return;
    }

    const selEvent = events.find(e => e.id === manualEventId);
    const selTier = selEvent?.tickets.find(t => t.id === manualTierId);
    if (!selEvent || !selTier) {
      alert('Event atau kategori tiket tidak valid.');
      return;
    }

    const selBank = currentBankAccounts.find(b => b.id === manualSelectedBankId) || currentBankAccounts[0];
    let channelLabel = 'Transfer Bank Manual';
    if (manualPaymentMethod === 'cash_loket') {
      channelLabel = 'Tunai / Cash di Loket (On The Spot)';
    } else if (manualPaymentMethod === 'qris_manual') {
      channelLabel = 'QRIS Statis / EDC Loket Kasir';
    } else if (selBank) {
      channelLabel = `Transfer ${selBank.bankName} (${selBank.accountNumber})`;
    }

    setIsSubmittingManualOrder(true);
    try {
      const res = await api.createAdminManualOrder({
        eventId: manualEventId,
        tierId: manualTierId,
        quantity: manualQuantity,
        buyerName: manualBuyerName.trim(),
        buyerEmail: manualBuyerEmail.trim(),
        buyerPhone: manualBuyerPhone.trim(),
        paymentMethod: manualPaymentMethod,
        paymentChannel: channelLabel,
        selectedBankId: manualSelectedBankId,
        senderBank: manualSenderBank,
        senderAccountName: manualSenderAccountName.trim() || manualBuyerName.trim(),
        paymentReference: manualPaymentRef.trim() || `LOKET-${Date.now()}`,
        transferNotes: manualTransferNotes.trim() || `Diinput manual oleh Super Admin (${currentUser.name})`,
        isPaidImmediate: manualIsImmediatePaid,
        verifiedBy: currentUser.name || 'Super Admin Pusat',
      });

      if (res.success && res.order) {
        setManualOrderCreatedResult(res.order);
        setAdminActionToast(`Transaksi ${res.order.orderNumber} berhasil disimpan! Status: ${res.order.paymentStatus.toUpperCase()}`);
        setTimeout(() => setAdminActionToast(null), 4000);
        onRefreshData();
      }
    } catch (err: any) {
      alert('Gagal mencatat transaksi manual: ' + err.message);
    } finally {
      setIsSubmittingManualOrder(false);
    }
  };

  // Creator Approval & Moderation State
  const [userSubTab, setUserSubTab] = useState<'all' | 'pending' | 'creators' | 'emails'>('all');
  const [sentEmails, setSentEmails] = useState<SentEmailNotification[]>([]);
  const [selectedEmailPreview, setSelectedEmailPreview] = useState<SentEmailNotification | null>(null);
  const [isApprovingUserId, setIsApprovingUserId] = useState<string | null>(null);
  const [approvalActionToast, setApprovalActionToast] = useState<string | null>(null);

  const pendingCreators = users.filter(u => u.role === 'creator' && u.status === 'pending_approval');
  const pendingCreatorsCount = pendingCreators.length;

  const fetchSentEmails = async () => {
    try {
      const logs = await api.getSentEmails();
      if (logs) setSentEmails(logs);
    } catch {}
  };

  const handleApproveCreator = async (userId: string) => {
    setIsApprovingUserId(userId);
    try {
      const res = await api.approveCreator(userId);
      setApprovalActionToast(res.message);
      onRefreshData();
      await fetchSentEmails();
      setTimeout(() => setApprovalActionToast(null), 5000);
    } catch (err: any) {
      setApprovalActionToast('Gagal menyetujui akun: ' + err.message);
      setTimeout(() => setApprovalActionToast(null), 4000);
    } finally {
      setIsApprovingUserId(null);
    }
  };

  const handleResendApprovalEmail = async (userId: string) => {
    try {
      const res = await api.resendApprovalEmail(userId);
      setApprovalActionToast(res.message);
      await fetchSentEmails();
      setTimeout(() => setApprovalActionToast(null), 4000);
    } catch (err: any) {
      setApprovalActionToast('Gagal mengirim ulang email: ' + err.message);
    }
  };

  // State Hapus Akun oleh Super Admin
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    setDeleteUserError(null);
    try {
      const res = await api.deleteUser(userToDelete.id);
      setApprovalActionToast(res.message);
      setUserToDelete(null);
      onRefreshData();
      setTimeout(() => setApprovalActionToast(null), 4000);
    } catch (err: any) {
      setDeleteUserError(err.message || 'Gagal menghapus akun pengguna');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // State Hapus Transaksi (Order) oleh Super Admin
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [deleteOrderError, setDeleteOrderError] = useState<string | null>(null);

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeletingOrder(true);
    setDeleteOrderError(null);
    try {
      const res = await api.deleteOrder(orderToDelete.id);
      setApprovalActionToast(res.message || 'Transaksi berhasil dihapus dan kuota tiket telah dikembalikan.');
      setOrderToDelete(null);
      onRefreshData();
      setTimeout(() => setApprovalActionToast(null), 4000);
    } catch (err: any) {
      setDeleteOrderError(err.message || 'Gagal menghapus transaksi');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // State Hapus Event oleh Super Admin
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [deleteEventError, setDeleteEventError] = useState<string | null>(null);

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    setIsDeletingEvent(true);
    setDeleteEventError(null);
    try {
      const res = await api.deleteEvent(eventToDelete.id);
      setApprovalActionToast(res.message || 'Event beserta seluruh tiket terkait berhasil dihapus.');
      setEventToDelete(null);
      onRefreshData();
      setTimeout(() => setApprovalActionToast(null), 4000);
    } catch (err: any) {
      setDeleteEventError(err.message || 'Gagal menghapus event');
    } finally {
      setIsDeletingEvent(false);
    }
  };

  // State Hapus Payout oleh Super Admin
  const [payoutToDelete, setPayoutToDelete] = useState<PayoutRequest | null>(null);
  const [isDeletingPayout, setIsDeletingPayout] = useState(false);
  const [deletePayoutError, setDeletePayoutError] = useState<string | null>(null);

  const handleDeletePayout = async () => {
    if (!payoutToDelete) return;
    setIsDeletingPayout(true);
    setDeletePayoutError(null);
    try {
      const res = await api.deletePayout(payoutToDelete.id);
      setApprovalActionToast(res.message || 'Pengajuan pencairan dana berhasil dihapus.');
      setPayoutToDelete(null);
      onRefreshData();
      setTimeout(() => setApprovalActionToast(null), 4000);
    } catch (err: any) {
      setDeletePayoutError(err.message || 'Gagal menghapus pengajuan pencairan');
    } finally {
      setIsDeletingPayout(false);
    }
  };

  // State Hapus Support Ticket oleh Super Admin
  const [supportToDelete, setSupportToDelete] = useState<SupportTicket | null>(null);
  const [isDeletingSupport, setIsDeletingSupport] = useState(false);
  const [deleteSupportError, setDeleteSupportError] = useState<string | null>(null);

  const handleDeleteSupportTicket = async () => {
    if (!supportToDelete) return;
    setIsDeletingSupport(true);
    setDeleteSupportError(null);
    try {
      const res = await api.deleteSupportTicket(supportToDelete.id);
      setApprovalActionToast(res.message || 'Tiket pengaduan kendala berhasil dihapus.');
      setSupportTickets(prev => prev.filter(t => t.id !== supportToDelete.id));
      setSupportToDelete(null);
      setTimeout(() => setApprovalActionToast(null), 4000);
    } catch (err: any) {
      setDeleteSupportError(err.message || 'Gagal menghapus tiket kendala');
    } finally {
      setIsDeletingSupport(false);
    }
  };

  const [mysqlHost, setMysqlHost] = useState('localhost');
  const [mysqlUser, setMysqlUser] = useState('bergulir_dbuser');
  const [mysqlPass, setMysqlPass] = useState('');
  const [mysqlDb, setMysqlDb] = useState('bergulir_celebeseventok');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingMysql, setIsTestingMysql] = useState(false);
  const [isCopiedSql, setIsCopiedSql] = useState(false);

  const handleCopySql = async () => {
    try {
      const res = await fetch('/api/export-sql');
      const sqlText = await res.text();
      await navigator.clipboard.writeText(sqlText);
      setIsCopiedSql(true);
      setTimeout(() => setIsCopiedSql(false), 3000);
    } catch {
      setIsCopiedSql(false);
    }
  };

  const fetchDbInfo = async () => {
    setIsLoadingDbStatus(true);
    try {
      const status = await api.getDbStatus();
      setDbStatus(status);
    } catch {
      // fallback
    } finally {
      setIsLoadingDbStatus(false);
    }
  };

  const fetchSettingsAndSupport = async () => {
    try {
      const [sets, tix] = await Promise.all([
        api.getSettings(),
        api.getSupportTickets(),
      ]);
      if (sets) {
        setSettingsForm({
          ...DEFAULT_PLATFORM_SETTINGS,
          ...sets,
          feeConfig: sets.feeConfig || DEFAULT_PLATFORM_SETTINGS.feeConfig,
          howToSteps: sets.howToSteps || DEFAULT_PLATFORM_SETTINGS.howToSteps,
          aboutUs: sets.aboutUs || DEFAULT_PLATFORM_SETTINGS.aboutUs,
          servicePackages: sets.servicePackages || DEFAULT_PLATFORM_SETTINGS.servicePackages,
          gallery: sets.gallery || DEFAULT_PLATFORM_SETTINGS.gallery,
        });
      }
      if (tix) setSupportTickets(tix);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchDbInfo();
    fetchSettingsAndSupport();
    fetchSentEmails();
  }, []);

  useEffect(() => {
    if (platformSettings) {
      setSettingsForm({
        ...DEFAULT_PLATFORM_SETTINGS,
        ...platformSettings,
        feeConfig: platformSettings.feeConfig || DEFAULT_PLATFORM_SETTINGS.feeConfig,
        howToSteps: platformSettings.howToSteps || DEFAULT_PLATFORM_SETTINGS.howToSteps,
        aboutUs: platformSettings.aboutUs || DEFAULT_PLATFORM_SETTINGS.aboutUs,
        servicePackages: platformSettings.servicePackages || DEFAULT_PLATFORM_SETTINGS.servicePackages,
        gallery: platformSettings.gallery || DEFAULT_PLATFORM_SETTINGS.gallery,
      });
    }
  }, [platformSettings]);

  // Platform metrics
  const totalGmv = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  const totalPlatformFees = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((acc, o) => acc + o.platformFee, 0);

  const totalTickets = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((acc, o) => acc + o.tickets.length, 0);

  // Handle Event Feature toggle
  const handleToggleFeatured = async (event: EventItem) => {
    try {
      await api.updateEvent(event.id, { isFeatured: !event.isFeatured });
      onRefreshData();
    } catch (err: any) {
      alert('Gagal mengubah status unggulan: ' + err.message);
    }
  };

  // Handle Event Status toggle
  const handleToggleEventStatus = async (event: EventItem, newStatus: any) => {
    try {
      await api.updateEvent(event.id, { status: newStatus });
      onRefreshData();
    } catch (err: any) {
      alert('Gagal mengubah status event: ' + err.message);
    }
  };

  // Handle Payout Approval
  const handleApprovePayout = async (payoutId: string) => {
    try {
      await api.updatePayoutStatus(payoutId, 'approved', 'Disetujui oleh Super Admin. Dana telah ditransfer ke rekening bank.');
      alert('Pencairan dana berhasil disetujui!');
      onRefreshData();
    } catch (err: any) {
      alert('Gagal menyetujui pencairan: ' + err.message);
    }
  };

  const handleRejectPayout = async (payoutId: string) => {
    const reason = prompt('Masukkan alasan penolakan pencairan:') || 'Data rekening tidak sesuai';
    try {
      await api.updatePayoutStatus(payoutId, 'rejected', reason);
      alert('Pencairan ditolak.');
      onRefreshData();
    } catch (err: any) {
      alert('Gagal menolak pencairan: ' + err.message);
    }
  };

  // Handle Test MySQL Connection
  const handleTestMysql = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingMysql(true);
    setTestResult(null);

    const res = await api.testMysqlConnection({
      host: mysqlHost,
      user: mysqlUser,
      password: mysqlPass,
      database: mysqlDb,
      port: 3306,
    });

    setTestResult(res);
    setIsTestingMysql(false);
  };

  // Manual payment handlers for Super Admin
  const handleAdminApprove = async (order: Order) => {
    try {
      await api.verifyPaymentOrder(order.id, 'paid', undefined, 'Super Admin Celebes Event');
      setAdminActionToast(`Pembayaran order ${order.orderNumber} disetujui! E-Ticket telah diaktifkan.`);
      setAdminPreviewProof(null);
      onRefreshData();
      setTimeout(() => setAdminActionToast(null), 4000);
    } catch (err: any) {
      alert('Gagal menyetujui: ' + err.message);
    }
  };

  const handleAdminReject = async () => {
    if (!adminRejectOrder) return;
    try {
      await api.verifyPaymentOrder(adminRejectOrder.id, 'payment_rejected', adminRejectReason, 'Super Admin Celebes Event');
      setAdminActionToast(`Pembayaran order ${adminRejectOrder.orderNumber} telah ditolak.`);
      setAdminRejectOrder(null);
      setAdminPreviewProof(null);
      onRefreshData();
      setTimeout(() => setAdminActionToast(null), 4000);
    } catch (err: any) {
      alert('Gagal menolak: ' + err.message);
    }
  };

  // Platform Settings Handlers
  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccessMessage(null);
    try {
      const res = await api.updateSettings(settingsForm);
      if (res.success) {
        setSettingsForm(res.settings);
        onUpdatePlatformSettings?.(res.settings);
        setSettingsSuccessMessage('Pengaturan platform, logo, & sosial media berhasil disimpan!');
        setTimeout(() => setSettingsSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      alert('Gagal menyimpan pengaturan platform: ' + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // QRIS API Handlers
  const handleSaveQrisConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingQris(true);
    setSettingsSuccessMessage(null);
    try {
      const res = await api.updateSettings({
        qrisConfig: settingsForm.qrisConfig,
      });
      if (res.success) {
        setSettingsForm(res.settings);
        onUpdatePlatformSettings?.(res.settings);
        setSettingsSuccessMessage('Kredensial Gateway & API QRIS berhasil disimpan!');
        setTimeout(() => setSettingsSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      alert('Gagal menyimpan API QRIS: ' + err.message);
    } finally {
      setIsSavingQris(false);
    }
  };

  const [isTestingMidtrans, setIsTestingMidtrans] = useState(false);
  const [midtransTestDetails, setMidtransTestDetails] = useState<any>(null);

  const handleTestQrisPing = async () => {
    const { serverKey, isSandbox } = settingsForm.qrisConfig;
    setIsTestingMidtrans(true);
    setQrisTestResult(null);
    setMidtransTestDetails(null);
    try {
      const res = await api.testMidtransConnection({
        serverKey: serverKey?.trim() || undefined,
        isSandbox,
      });
      setQrisTestResult(res.message);
      setMidtransTestDetails(res.details || null);
    } catch (err: any) {
      setQrisTestResult(`❌ Gagal terhubung ke Midtrans API: ${err.message || 'Periksa koneksi jaringan'}`);
    } finally {
      setIsTestingMidtrans(false);
    }
  };

  // Support Ticket Reply Handler
  const handleSubmitAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForReply) return;
    setIsSubmittingReply(true);
    try {
      const res = await api.updateSupportTicket(selectedTicketForReply.id, {
        adminReply: adminReplyText,
        status: adminReplyStatus,
      });
      if (res.success) {
        setSupportTickets(prev =>
          prev.map(t => (t.id === res.ticket.id ? res.ticket : t))
        );
        setSelectedTicketForReply(null);
        setAdminReplyText('');
        alert('Tanggapan bantuan berhasil dikirimkan ke pengguna.');
      }
    } catch (err: any) {
      alert('Gagal mengirim tanggapan bantuan: ' + err.message);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Super Admin Control Center
              </span>
              <span className="text-xs text-slate-400 font-mono">Celebes Event Platform Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Portal Kendali Penuh Super Admin
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Pantau seluruh transaksi platform, moderasi event, kelola kreator, approve pencairan dana, dan kelola database MySQL hosting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('database')}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-purple-500/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Kelola DB MySQL Hosting</span>
            </button>
          </div>
        </div>

        {/* Global Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Gross Merchandise Value (GMV)</span>
            <span className="text-lg sm:text-xl font-extrabold text-white mt-1 block">
              {formatRupiah(totalGmv)}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">
              Total omzet seluruh event
            </span>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Total Pendapatan Komisi</span>
            <span className="text-lg sm:text-xl font-extrabold text-purple-400 mt-1 block">
              {formatRupiah(totalPlatformFees)}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Biaya layanan Celebes Event
            </span>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Tiket Terdistribusi</span>
            <span className="text-lg sm:text-xl font-extrabold text-blue-400 mt-1 block">
              {totalTickets} E-Tickets
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Lunas & Berbarcode
            </span>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Total Event Terdaftar</span>
            <span className="text-lg sm:text-xl font-extrabold text-amber-400 mt-1 block">
              {events.length} Event
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Multi-kategori nasional
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-2 text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Ringkasan Eksekutif</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'events'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Moderasi Event ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Pengguna & Kreator</span>
          {pendingCreatorsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 animate-pulse">
              {pendingCreatorsCount} Baru
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Semua Transaksi ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('manual-payments')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'manual-payments'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Verifikasi Pembayaran Manual</span>
          {adminPendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {adminPendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'payouts'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Persetujuan Payout ({payouts.filter(p => p.status === 'pending').length} Menunggu)</span>
        </button>

        <button
          onClick={() => setActiveTab('news')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'news'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span>Berita & Info Event Indonesia</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Pengaturan Platform & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('qris-api')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'qris-api'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Gateway & API QRIS</span>
        </button>

        <button
          onClick={() => setActiveTab('support-desk')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'support-desk'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>Pusat Bantuan & Kendala</span>
          {supportTickets.filter(t => t.status === 'open').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
              {supportTickets.filter(t => t.status === 'open').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'database'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>MySQL & Hosting Hub</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {/* Quick Status Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Status Sistem & Arsitektur Hosting</h4>
                  <p className="text-xs text-slate-500">
                    Engine: Node.js + Express • DB: MySQLi Compatible • Siap Hosting cPanel/VPS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('database')}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                Lihat Skema SQL
              </button>
            </div>

            {/* Recent Orders List */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">Transaksi Penjualan Tiket Terbaru</h3>
                <button onClick={() => setActiveTab('transactions')} className="text-xs text-purple-600 font-bold hover:underline">
                  Lihat Semua →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                    <tr>
                      <th className="p-2.5">No Order</th>
                      <th className="p-2.5">Pembeli</th>
                      <th className="p-2.5">Event</th>
                      <th className="p-2.5">Metode</th>
                      <th className="p-2.5">Total</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.slice(0, 5).map(o => (
                      <tr key={o.id}>
                        <td className="p-2.5 font-mono font-bold text-blue-700">{o.orderNumber}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{o.buyerName}</td>
                        <td className="p-2.5 truncate max-w-[180px]">{o.eventTitle}</td>
                        <td className="p-2.5 uppercase font-mono text-[10px]">{o.paymentMethod}</td>
                        <td className="p-2.5 font-bold text-slate-900">{formatRupiah(o.totalAmount)}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {o.paymentStatus.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            {/* Pending Payouts Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">Permintaan Payout Kreator</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {payouts.filter(p => p.status === 'pending').length} Menunggu
                </span>
              </div>

              <div className="space-y-2.5">
                {payouts.slice(0, 3).map(p => (
                  <div key={p.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-900">{p.creatorName}</span>
                      <span className="font-bold text-emerald-600">{formatRupiah(p.amount)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{p.bankName} • {p.accountNumber}</p>
                    {p.status === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleApprovePayout(p.id)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-bold hover:bg-emerald-700"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleRejectPayout(p.id)}
                          className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold hover:bg-slate-300"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MODERASI EVENT */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Manajemen & Moderasi Seluruh Event</h2>
              <p className="text-xs text-slate-500">Super admin dapat mengubah status publikasi atau menandai event unggulan</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3">Judul Event</th>
                  <th className="p-3">Kreator</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Tiket Terjual</th>
                  <th className="p-3">Unggulan (Featured)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Aksi Moderasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map(event => {
                  const sold = event.tickets.reduce((acc, t) => acc + (t.soldCount || 0), 0);
                  const quota = event.tickets.reduce((acc, t) => acc + t.quota, 0);

                  return (
                    <tr key={event.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900 max-w-xs">{event.title}</td>
                      <td className="p-3 text-slate-600">{event.creatorName || 'Kreator'}</td>
                      <td className="p-3">{event.category}</td>
                      <td className="p-3 font-semibold text-slate-800">{sold} / {quota}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleFeatured(event)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                            event.isFeatured ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{event.isFeatured ? 'Unggulan' : 'Standar'}</span>
                        </button>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          event.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {event.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleEventStatus(event, event.status === 'published' ? 'draft' : 'published')}
                            className="text-xs text-blue-600 font-bold hover:underline"
                          >
                            {event.status === 'published' ? 'Tutup Pendaftaran' : 'Buka Publik'}
                          </button>
                          <button
                            onClick={() => setEventToDelete(event)}
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-transparent hover:border-rose-200"
                            title="Hapus Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PENGGUNA, PERSETUJUAN KREATOR & LOG EMAIL */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Action Notification Toast */}
          {approvalActionToast && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{approvalActionToast}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  Manajemen Pengguna & Persetujuan Kreator Event
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifikasi pendaftaran kreator (Google / Formulir) dan otomatis kirim email konfirmasi resmi.
                </p>
              </div>

              {pendingCreatorsCount > 0 && (
                <div className="px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2 text-xs text-amber-900 font-bold">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span>{pendingCreatorsCount} Kreator Baru Butuh Persetujuan!</span>
                </div>
              )}
            </div>

            {/* Sub-tabs Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setUserSubTab('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  userSubTab === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Pengguna ({users.length})
              </button>

              <button
                type="button"
                onClick={() => setUserSubTab('pending')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  userSubTab === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Menunggu Persetujuan</span>
                {pendingCreatorsCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    userSubTab === 'pending' ? 'bg-white text-amber-900' : 'bg-amber-600 text-white'
                  }`}>
                    {pendingCreatorsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setUserSubTab('creators')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  userSubTab === 'creators'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                Kreator Event ({users.filter(u => u.role === 'creator').length})
              </button>

              <button
                type="button"
                onClick={() => setUserSubTab('emails')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  userSubTab === 'emails'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Log Email Persetujuan Terkirim ({sentEmails.length})</span>
              </button>
            </div>

            {/* VIEW A: LOG EMAIL TERKIRIM */}
            {userSubTab === 'emails' ? (
              <div className="space-y-4">
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <span>Daftar notifikasi email resmi yang berhasil diterbitkan dan dikirim ke alamat email kreator.</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchSentEmails}
                    className="font-bold text-purple-700 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Segarkan Log</span>
                  </button>
                </div>

                {sentEmails.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Belum ada log email persetujuan yang terkirim.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                        <tr>
                          <th className="p-3">Waktu Terkirim</th>
                          <th className="p-3">Penerima Email</th>
                          <th className="p-3">Subjek Pemberitahuan</th>
                          <th className="p-3">Pengirim</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sentEmails.map((email) => (
                          <tr key={email.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(email.sentAt).toLocaleString('id-ID')}
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-900 block">{email.recipientName}</span>
                              <span className="font-mono text-[11px] text-blue-700">{email.recipientEmail}</span>
                            </td>
                            <td className="p-3 font-medium text-slate-800 max-w-xs truncate">
                              {email.subject}
                            </td>
                            <td className="p-3 text-[11px] text-slate-500">
                              Super Admin Pusat
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Terkirim (Delivered)</span>
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedEmailPreview(email)}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 transition-colors cursor-pointer"
                              >
                                Lihat Isi Surat
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* VIEW B: TABEL PENGGUNA & MODERASI PERSETUJUAN */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-3">Nama & Organisasi</th>
                      <th className="p-3">Email & WhatsApp</th>
                      <th className="p-3">Peran (Role)</th>
                      <th className="p-3">Autentikasi</th>
                      <th className="p-3">Status Akun</th>
                      <th className="p-3 text-right">Aksi Super Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter((u) => {
                        if (userSubTab === 'pending') return u.status === 'pending_approval';
                        if (userSubTab === 'creators') return u.role === 'creator';
                        return true;
                      })
                      .map((u) => {
                        const isPending = u.status === 'pending_approval';
                        return (
                          <tr
                            key={u.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isPending ? 'bg-amber-50/40 border-l-4 border-l-amber-500' : ''
                            }`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80'}
                                  alt={u.name}
                                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                                />
                                <div>
                                  <span className="font-bold text-slate-900 block">{u.name}</span>
                                  {u.organization && (
                                    <span className="text-[11px] text-slate-500 block">
                                      🏢 {u.organization}
                                    </span>
                                  )}
                                  {u.city && (
                                    <span className="text-[10px] text-slate-400 block">
                                      📍 {u.city}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="p-3">
                              <span className="font-mono text-slate-800 block">{u.email}</span>
                              <span className="text-[11px] text-slate-500">{u.phone || '-'}</span>
                            </td>

                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : u.role === 'creator'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {u.role === 'admin' ? 'SUPER ADMIN' : u.role === 'creator' ? 'KREATOR EVENT' : 'PESERTA'}
                              </span>
                            </td>

                            <td className="p-3">
                              {u.auth_provider === 'google' ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
                                  <svg className="w-3 h-3" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                  </svg>
                                  Google Account
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono text-slate-500 uppercase">
                                  Email & Password
                                </span>
                              )}
                            </td>

                            <td className="p-3">
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                  Menunggu Persetujuan
                                </span>
                              ) : u.status === 'suspended' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Ditangguhkan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Aktif & Resmi
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {isPending ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isApprovingUserId === u.id}
                                      onClick={() => handleApproveCreator(u.id)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                                      title="Setujui pendaftaran kreator dan kirim email resmi"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>
                                        {isApprovingUserId === u.id ? 'Memproses...' : 'Setujui & Kirim Email'}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Mock preview for unapproved
                                        setSelectedEmailPreview({
                                          id: 'preview-temp',
                                          recipientEmail: u.email,
                                          recipientName: u.name,
                                          recipientRole: 'creator',
                                          subject: `🎉 Selamat! Akun Kreator Celebes Event "${u.organization || u.name}" Telah Disetujui Admin Pusat`,
                                          bodyHtml: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                                            <h2 style="color: #1e3a8a;">Pemberitahuan Persetujuan Resmi</h2>
                                            <p>Yth. <strong>${u.name}</strong> (${u.organization || 'Kreator Event'}),</p>
                                            <p>Akun Anda telah disetujui oleh Super Admin. Setelah disetujui, Anda dapat segera menerbitkan event dan tiket.</p>
                                          </div>`,
                                          type: 'creator_approved',
                                          sentAt: new Date().toISOString(),
                                          status: 'delivered',
                                          sender: 'Super Admin Pusat Celebes Event <redaksibergulircom@gmail.com>',
                                        });
                                      }}
                                      className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                                      title="Lihat Pratinjau Surat Email Persetujuan"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : u.role === 'creator' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleResendApprovalEmail(u.id)}
                                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Kirim ulang surat pemberitahuan ke email kreator"
                                  >
                                    <Mail className="w-3 h-3" />
                                    <span>Kirim Ulang Email</span>
                                  </button>
                                ) : null}

                                {/* Tombol Hapus Akun oleh Super Admin */}
                                {u.id !== 'usr-admin-bergulir' && u.id !== 'usr-admin-01' && u.email !== 'redaksibergulircom@gmail.com' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUserToDelete(u);
                                      setDeleteUserError(null);
                                    }}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Hapus akun pengguna ini secara permanen dari sistem"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-600" />
                                    <span>Hapus</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-purple-700 font-bold px-1.5 py-0.5 bg-purple-50 rounded border border-purple-200">
                                    Akun Utama
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* MODAL KONFIRMASI HAPUS AKUN PENGGUNA */}
          {userToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 text-center space-y-4">
                  <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
                    <Trash2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Akun</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Apakah Anda yakin ingin menghapus akun pengguna ini secara permanen? Tindakan ini tidak dapat dibatalkan.
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left text-xs space-y-1">
                    <div className="font-bold text-slate-900">{userToDelete.name}</div>
                    <div className="text-slate-600 font-mono text-[11px]">{userToDelete.email}</div>
                    {userToDelete.organization && (
                      <div className="text-slate-500 text-[11px]">🏢 {userToDelete.organization}</div>
                    )}
                    <div className="text-[10px] text-slate-500 uppercase font-semibold mt-1">
                      Peran: {userToDelete.role === 'admin' ? 'Super Admin' : userToDelete.role === 'creator' ? 'Kreator Event' : 'Peserta'}
                    </div>
                  </div>

                  {deleteUserError && (
                    <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium border border-rose-200">
                      {deleteUserError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isDeletingUser}
                      onClick={() => setUserToDelete(null)}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingUser}
                      onClick={handleDeleteUser}
                      className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDeletingUser ? 'Menghapus...' : 'Ya, Hapus Akun'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL PREVIEW SURAT NOTIFIKASI EMAIL */}
          {selectedEmailPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
                <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Pratinjau Surat Email Notifikasi Masuk</h3>
                      <p className="text-[11px] text-slate-300">Diterima oleh: {selectedEmailPreview.recipientEmail}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEmailPreview(null)}
                    className="p-1 text-slate-300 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                    <div><strong>Kepada:</strong> {selectedEmailPreview.recipientName} &lt;{selectedEmailPreview.recipientEmail}&gt;</div>
                    <div><strong>Dari:</strong> {selectedEmailPreview.sender}</div>
                    <div><strong>Subjek:</strong> {selectedEmailPreview.subject}</div>
                    <div><strong>Waktu Kirim:</strong> {new Date(selectedEmailPreview.sentAt).toLocaleString('id-ID')}</div>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-2xs">
                    <div dangerouslySetInnerHTML={{ __html: selectedEmailPreview.bodyHtml }} />
                  </div>
                </div>

                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedEmailPreview(null)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    Tutup Pratinjau
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TRANSAKSI & PEMBAYARAN */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b pb-4">
            <h2 className="text-base font-bold text-slate-900">Seluruh Transaksi Penjualan Tiket</h2>
            <p className="text-xs text-slate-500">Daftar pesanan tiket lengkap dengan saluran pembayaran (QRIS, VA, Transfer)</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3">Nomor Order</th>
                  <th className="p-3">Pembeli</th>
                  <th className="p-3">Event</th>
                  <th className="p-3">Tiket</th>
                  <th className="p-3">Metode Bayar</th>
                  <th className="p-3">Subtotal</th>
                  <th className="p-3">Komisi</th>
                  <th className="p-3">Total Tagihan</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-700">{o.orderNumber}</td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-900 block">{o.buyerName}</span>
                      <span className="text-[10px] text-slate-500">{o.buyerPhone}</span>
                    </td>
                    <td className="p-3 truncate max-w-[150px]">{o.eventTitle}</td>
                    <td className="p-3 font-bold">{o.tickets.length} Tiket</td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800 block text-[11px]">{o.paymentChannel || o.paymentMethod}</span>
                      <span className="text-[10px] font-mono text-slate-400">{o.paymentReference || '-'}</span>
                    </td>
                    <td className="p-3">{formatRupiah(o.subtotal)}</td>
                    <td className="p-3 text-purple-700 font-medium">+{formatRupiah(o.platformFee)}</td>
                    <td className="p-3 font-extrabold text-slate-900">{formatRupiah(o.totalAmount)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {o.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => setOrderToDelete(o)}
                        className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 border border-transparent hover:border-rose-200"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PERSETUJUAN PAYOUT */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b pb-4">
            <h2 className="text-base font-bold text-slate-900">Persetujuan & Pemrosesan Pencairan Dana Kreator</h2>
            <p className="text-xs text-slate-500">Super admin memverifikasi dan menyetujui transfer hasil penjualan tiket</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3">Nama Kreator</th>
                  <th className="p-3">Event Terkait</th>
                  <th className="p-3">Rincian Dana & Potongan Platform</th>
                  <th className="p-3">Rekening Tujuan</th>
                  <th className="p-3">Waktu Pengajuan</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Tindakan Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map(p => {
                  const netVal = p.netAmount ?? p.amount;
                  const grossVal = p.grossAmount ?? p.amount;
                  const feeVal = p.platformFeeDeduction ?? (grossVal - netVal);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{p.creatorName}</td>
                      <td className="p-3 text-slate-600">{p.eventTitle}</td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-emerald-700 text-sm">
                            {formatRupiah(netVal)} <span className="text-[10px] text-slate-400 font-normal">(Bersih Ditransfer)</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Kotor: <span className="font-semibold text-slate-700">{formatRupiah(grossVal)}</span>
                          </div>
                          <div className="text-[11px] text-red-600 font-medium">
                            Potongan Platform: -{formatRupiah(feeVal)}
                          </div>
                          {p.feeBreakdownText && (
                            <div className="text-[10px] text-slate-400 italic">
                              {p.feeBreakdownText}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold block">{p.bankName}</span>
                        <span className="font-mono text-slate-500">{p.accountNumber} ({p.accountName})</span>
                      </td>
                    <td className="p-3 text-slate-500">{new Date(p.createdAt).toLocaleDateString('id-ID')}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : p.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {p.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApprovePayout(p.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                            >
                              Setujui & Transfer
                            </button>
                            <button
                              onClick={() => handleRejectPayout(p.id)}
                              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                            >
                              Tolak
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Selesai diproses</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setPayoutToDelete(p)}
                          className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 border border-transparent hover:border-rose-200"
                          title="Hapus Pengajuan Pencairan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: MANAJEMEN BERITA & LIPUTAN EVENT NASIONAL */}
      {activeTab === 'news' && (
        <AdminNewsManager onRefreshData={onRefreshData} />
      )}

      {/* TAB: VERIFIKASI PEMBAYARAN MANUAL & MASTER DATA REKENING (BLUEPRINT V3) */}
      {activeTab === 'manual-payments' && (
        <div className="space-y-6">
          {/* Sub-Navigation for Manual Payments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAdminManualSubTab('approvals')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  adminManualSubTab === 'approvals'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approval Verifikasi Transaksi</span>
                {adminPendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 font-extrabold text-[10px]">
                    {adminPendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAdminManualSubTab('input-manual')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  adminManualSubTab === 'input-manual'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Layanan Input Transaksi Manual</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Loket / Kasir
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAdminManualSubTab('accounts')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  adminManualSubTab === 'accounts'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Pilih Rekening Bank Tujuan Transfer (Master Data Resmi)</span>
                <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">
                  {currentBankAccounts.filter(b => b.isActive !== false).length} Rekening Aktif
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {adminManualSubTab === 'accounts' && (
                <>
                  <button
                    type="button"
                    onClick={handleResetDefaultBankAccounts}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Kembalikan ke 3 rekening resmi default"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Reset 3 Rekening Resmi</span>
                  </button>
                  {!isAddingBank && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCancelBankForm();
                        setIsAddingBank(true);
                      }}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Input Rekening Baru</span>
                    </button>
                  )}
                </>
              )}

              {adminManualSubTab !== 'input-manual' && (
                <button
                  type="button"
                  onClick={() => setAdminManualSubTab('input-manual')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Input Transaksi Kasir</span>
                </button>
              )}
            </div>
          </div>

          {/* SUB-VIEW 1: MASTER DATA REKENING RESMI (BLUEPRINT V3) */}
          {adminManualSubTab === 'accounts' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                      Master Data Keuangan Resmi
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-bold text-emerald-600">
                      {currentBankAccounts.filter(b => b.isActive !== false).length} Rekening Aktif di Checkout
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Pilih Rekening Bank Tujuan Transfer (Master Data Resmi)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Rekening bank resmi Celebes Event yang ditampilkan dinamis kepada peserta saat memilih metode transfer manual di halaman checkout. Super Admin dapat menginput secara manual rekening baru, mengedit, mengaktifkan/menonaktifkan, atau mereset ke 3 Rekening Resmi Default.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaultBankAccounts}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset 3 Rekening Resmi Default</span>
                  </button>
                </div>
              </div>

              {/* Form Input / Edit Rekening Bank Secara Manual */}
              {isAddingBank && (
                <form
                  onSubmit={handleAddOrEditBankAccount}
                  className="bg-white rounded-2xl border border-purple-300 p-6 shadow-md space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      {editingBankId ? 'Edit Rekening Bank Tujuan Transfer' : 'Tambah Rekening Bank Tujuan Transfer (Input Manual Super Admin)'}
                    </h3>
                    <button
                      type="button"
                      onClick={handleCancelBankForm}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nama Bank *</label>
                      <input
                        type="text"
                        required
                        value={newBankName}
                        onChange={(e) => setNewBankName(e.target.value)}
                        placeholder="Contoh: Bank BCA / Bank Mandiri / Bank BSI (Syariah)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Kode Bank / Singkatan</label>
                      <input
                        type="text"
                        value={newBankCode}
                        onChange={(e) => setNewBankCode(e.target.value)}
                        placeholder="Contoh: BCA / MANDIRI / BSI"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nomor Rekening *</label>
                      <input
                        type="text"
                        required
                        value={newAccountNumber}
                        onChange={(e) => setNewAccountNumber(e.target.value)}
                        placeholder="Contoh: 888-019-2831 atau 137-00-19283-912"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Atas Nama (Pemilik Rekening) *</label>
                      <input
                        type="text"
                        required
                        value={newAccountName}
                        onChange={(e) => setNewAccountName(e.target.value)}
                        placeholder="Contoh: PT CELEBES EVENT DIGITAL"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Catatan Instruksi Pembeli (Opsional)</label>
                      <input
                        type="text"
                        value={newNotes}
                        onChange={(e) => setNewNotes(e.target.value)}
                        placeholder="Contoh: Transfer via m-BCA, Livin by Mandiri, BSI Mobile, atau ATM"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={handleCancelBankForm}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {editingBankId ? 'Perbarui Rekening di Master Data' : 'Simpan Rekening Baru ke Master Data'}
                    </button>
                  </div>
                </form>
              )}

              {/* Grid of Bank Accounts */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentBankAccounts.map((account) => {
                  const isActive = account.isActive !== false;
                  return (
                    <div
                      key={account.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-white border-slate-200 shadow-xs ring-1 ring-slate-100'
                          : 'bg-slate-50 border-dashed border-slate-300 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800">
                          {account.bankCode || 'BANK'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleBankAccountActive(account.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {isActive ? '● Aktif di Checkout' : '○ Nonaktif'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditBank(account)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer transition-colors"
                            title="Edit Rekening"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBankAccount(account.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                            title="Hapus Rekening"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-base">{account.bankName}</h4>
                      
                      <div className="mt-3 p-3 bg-slate-950 text-white rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Nomor Rekening:</span>
                          <span className="font-mono font-bold text-sm text-emerald-400 tracking-wider">
                            {account.accountNumber}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(account.accountNumber.replace(/-/g, ''));
                            setAdminActionToast(`Nomor rekening ${account.bankName} (${account.accountNumber}) berhasil disalin!`);
                            setTimeout(() => setAdminActionToast(null), 3000);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs cursor-pointer transition-colors"
                          title="Salin Nomor"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-3 text-xs space-y-1 text-slate-600">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Atas Nama:</span>
                          <span className="font-semibold text-slate-800">{account.accountName}</span>
                        </div>
                        {account.notes && (
                          <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/60 mt-2">
                            {account.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 flex items-start gap-3">
                <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-0.5">Integrasi Master Data Real-Time (Blueprint v3):</strong>
                  <span>
                    Rekening berstatus <strong>Aktif</strong> otomatis dimuat secara langsung di pilihan bank tujuan pembayaran pembeli pada modal checkout. Saat ini terdapat <strong>3 Rekening Aktif Resmi</strong> default (Bank BCA: 888-019-2831, Bank Mandiri: 137-00-19283-912, dan Bank BSI Syariah: 719-283-0012) yang siap menerima transfer pembeli.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: LAYANAN SUPER ADMIN MENGINPUT PESANAN SECARA MANUAL (LOKET / KASIR) */}
          {adminManualSubTab === 'input-manual' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      Layanan Kasir & Loket Khusus
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-600">Manual Entry Form</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Layanan Super Admin Input Transaksi & Pembayaran Manual
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Fasilitas resmi Super Admin untuk menginput transaksi secara manual saat peserta membeli tiket offline di kasir loket, transfer langsung via rekening admin, atau pendaftaran via WhatsApp dengan kalkulasi bagi hasil otomatis (Blueprint v3).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 font-bold rounded-xl border border-purple-200">
                    Admin Aktif: {currentUser.name}
                  </span>
                </div>
              </div>

              {/* Notification Banner when order is successfully created */}
              {manualOrderCreatedResult && (
                <div className="p-5 bg-emerald-50 border-2 border-emerald-500 rounded-2xl shadow-sm text-xs space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Transaksi Manual Berhasil Diterbitkan!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManualOrderCreatedResult(null)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-emerald-200">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Nomor Order:</span>
                      <span className="font-mono font-bold text-slate-900">{manualOrderCreatedResult.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Nama Pendaftar:</span>
                      <span className="font-bold text-slate-900">{manualOrderCreatedResult.buyerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Transaksi:</span>
                      <span className="font-bold text-emerald-600">{formatRupiah(manualOrderCreatedResult.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Status Pembayaran:</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        manualOrderCreatedResult.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {manualOrderCreatedResult.paymentStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAdminManualSubTab('approvals')}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Lihat di Tabel Transaksi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManualBuyerName('');
                        setManualBuyerEmail('');
                        setManualBuyerPhone('');
                        setManualPaymentRef('');
                        setManualTransferNotes('');
                        setManualOrderCreatedResult(null);
                      }}
                      className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-bold text-xs cursor-pointer"
                    >
                      + Input Transaksi Baru Lagi
                    </button>
                  </div>
                </div>
              )}

              {/* Form Input Transaksi Manual */}
              <form onSubmit={handleSubmitManualOrder} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Event & Tiket & Buyer */}
                  <div className="lg:col-span-2 space-y-5">
                    {/* Event & Tier Selection */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        1. Pilih Event & Kategori Tiket
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Event Tujuan *</label>
                          <select
                            required
                            value={manualEventId}
                            onChange={(e) => setManualEventId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                          >
                            {events.map((evt) => (
                              <option key={evt.id} value={evt.id}>
                                {evt.title} ({evt.category})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Kategori Tiket (Tier) *</label>
                          {(() => {
                            const curEvent = events.find(e => e.id === manualEventId);
                            const tiers = curEvent?.tickets || [];
                            return (
                              <select
                                required
                                value={manualTierId}
                                onChange={(e) => setManualTierId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                              >
                                {tiers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} - {t.price === 0 ? 'Gratis' : formatRupiah(t.price)} (Sisa: {Math.max(0, t.quota - (t.soldCount || 0))})
                                  </option>
                                ))}
                              </select>
                            );
                          })()}
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Jumlah Tiket *</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            required
                            value={manualQuantity}
                            onChange={(e) => setManualQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Buyer Information */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-purple-600" />
                        2. Identitas Pembeli / Pendaftar
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Pembeli *</label>
                          <input
                            type="text"
                            required
                            value={manualBuyerName}
                            onChange={(e) => setManualBuyerName(e.target.value)}
                            placeholder="Contoh: Rahmat Hidayat"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Email Pembeli (Kirim Tiket) *</label>
                          <input
                            type="email"
                            required
                            value={manualBuyerEmail}
                            onChange={(e) => setManualBuyerEmail(e.target.value)}
                            placeholder="Contoh: rahmat@gmail.com"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">No. WhatsApp / Telepon</label>
                          <input
                            type="text"
                            value={manualBuyerPhone}
                            onChange={(e) => setManualBuyerPhone(e.target.value)}
                            placeholder="Contoh: 081234567890"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-purple-600" />
                        3. Metode & Detail Pembayaran Manual
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Metode Pembayaran *</label>
                          <select
                            value={manualPaymentMethod}
                            onChange={(e) => setManualPaymentMethod(e.target.value as any)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                          >
                            <option value="transfer_manual">Transfer Bank Manual (Internal)</option>
                            <option value="cash_loket">Tunai / Cash di Loket (On The Spot)</option>
                            <option value="qris_manual">QRIS Statis / Mesin EDC Kasir</option>
                          </select>
                        </div>

                        {manualPaymentMethod === 'transfer_manual' && (
                          <div>
                            <label className="block font-bold text-slate-700 mb-1">Rekening Bank Tujuan (Master Data) *</label>
                            <select
                              value={manualSelectedBankId}
                              onChange={(e) => setManualSelectedBankId(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                            >
                              {currentBankAccounts.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.bankName} - {b.accountNumber} ({b.accountName})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">No. Referensi / Nomor Struk / Mutasi</label>
                          <input
                            type="text"
                            value={manualPaymentRef}
                            onChange={(e) => setManualPaymentRef(e.target.value)}
                            placeholder="Contoh: REF-BCA-981293 / STRUK-001"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Rekening & Nama Pengirim (Jika Transfer)</label>
                          <input
                            type="text"
                            value={manualSenderAccountName}
                            onChange={(e) => setManualSenderAccountName(e.target.value)}
                            placeholder="Contoh: Andi Pratama (BCA)"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-bold text-slate-700 mb-1">Catatan Khusus Petugas Admin / Kasir</label>
                          <input
                            type="text"
                            value={manualTransferNotes}
                            onChange={(e) => setManualTransferNotes(e.target.value)}
                            placeholder="Contoh: Pembayaran tunai diterima langsung di kasir loket gate 1"
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status Direct Action */}
                    <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 text-xs">
                      <span className="font-bold text-purple-900 block">Pilihan Status Pembayaran Tiket:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          manualIsImmediatePaid ? 'bg-white border-purple-600 ring-2 ring-purple-500/20 shadow-xs' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <input
                            type="radio"
                            name="manualStatus"
                            checked={manualIsImmediatePaid}
                            onChange={() => setManualIsImmediatePaid(true)}
                            className="mt-0.5 text-purple-600"
                          />
                          <div>
                            <span className="font-extrabold text-slate-900 block">Langsung LUNAS (PAID)</span>
                            <span className="text-[11px] text-slate-500">
                              E-Tiket resmi dengan QR Code langsung terbit, hak kreator langsung dikreditkan ke saldo dompet, dan notifikasi email terkirim.
                            </span>
                          </div>
                        </label>

                        <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          !manualIsImmediatePaid ? 'bg-white border-purple-600 ring-2 ring-purple-500/20 shadow-xs' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <input
                            type="radio"
                            name="manualStatus"
                            checked={!manualIsImmediatePaid}
                            onChange={() => setManualIsImmediatePaid(false)}
                            className="mt-0.5 text-purple-600"
                          />
                          <div>
                            <span className="font-extrabold text-slate-900 block">Menunggu Approval (Pending)</span>
                            <span className="text-[11px] text-slate-500">
                              Masuk ke daftar antrean verifikasi manual untuk dicek ulang bukti transfernya sebelum disetujui.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Financial Split Calculator (Blueprint v3) */}
                  <div className="space-y-4">
                    {(() => {
                      const curEvent = events.find(e => e.id === manualEventId);
                      const curTier = curEvent?.tickets.find(t => t.id === manualTierId);
                      const unitPrice = curTier ? Number(curTier.price) : 0;
                      const isFree = unitPrice === 0;
                      const subtotal = unitPrice * manualQuantity;
                      const platformFee = isFree ? 0 : 2000; // Flat Rp 2.000 (Blueprint v3)
                      const totalAmount = subtotal + platformFee;
                      const potonganKreator = isFree ? 0 : Math.round(0.02 * subtotal); // 2%
                      const netKreator = isFree ? 0 : Math.max(0, subtotal - potonganKreator);
                      const totalMarginPlatform = isFree ? 0 : (platformFee + potonganKreator);

                      return (
                        <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4 text-xs">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h4 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                              <Wallet className="w-4 h-4" />
                              Kalkulasi Finansial (Blueprint v3)
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full font-mono">
                              Otomatis
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Harga Asli Tiket:</span>
                              <span className="font-mono font-bold text-white">
                                {formatRupiah(subtotal)}
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Biaya Admin Platform (Flat):</span>
                              <span className="font-mono font-bold text-blue-400">
                                {formatRupiah(platformFee)}
                              </span>
                            </div>

                            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
                              <span className="font-extrabold text-white">Total Tagihan Peserta:</span>
                              <span className="font-mono font-extrabold text-emerald-400 text-base">
                                {formatRupiah(totalAmount)}
                              </span>
                            </div>

                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 mt-3">
                              <div className="text-[11px] font-bold text-slate-300">
                                Distribusi Dana Setelah Lunas:
                              </div>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-400">Komisi Platform Kreator (2%):</span>
                                <span className="font-mono text-amber-400">
                                  {formatRupiah(potonganKreator)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-400">Hak Bersih Saldo Kreator:</span>
                                <span className="font-mono font-bold text-emerald-300">
                                  {formatRupiah(netKreator)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-800/80">
                                <span className="text-slate-300 font-bold">Total Margin Kas Celebes Event:</span>
                                <span className="font-mono font-bold text-blue-300">
                                  {formatRupiah(totalMarginPlatform)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmittingManualOrder}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
                          >
                            {isSubmittingManualOrder ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>{isSubmittingManualOrder ? 'Menerbitkan Transaksi...' : 'Simpan & Terbitkan Tiket Manual'}</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* SUB-VIEW 2: APPROVAL VERIFIKASI TRANSAKSI */}
          {adminManualSubTab === 'approvals' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                      Platform Oversight Hub
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{adminPendingCount} Menunggu Verifikasi</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Pusat Verifikasi Pembayaran Manual Seluruh Event
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Super admin dapat meninjau, menyetujui, atau menganulir verifikasi transfer manual dengan distribusi bagi hasil otomatis (Blueprint v3).
                  </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto self-start sm:self-auto">
                  <button
                    onClick={() => setAdminManualFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      adminManualFilter === 'all'
                        ? 'bg-purple-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({adminManualOrders.length})
                  </button>
                  <button
                    onClick={() => setAdminManualFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      adminManualFilter === 'pending'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <span>Menunggu ({adminPendingCount})</span>
                  </button>
                  <button
                    onClick={() => setAdminManualFilter('paid')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      adminManualFilter === 'paid'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Disetujui ({adminManualOrders.filter(o => o.paymentStatus === 'paid').length})
                  </button>
                  <button
                    onClick={() => setAdminManualFilter('rejected')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      adminManualFilter === 'rejected'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Ditolak ({adminManualOrders.filter(o => o.paymentStatus === 'payment_rejected').length})
                  </button>
                </div>
              </div>

              {/* Table of Manual Verification Orders */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                      <tr>
                        <th className="p-3">Order & Waktu</th>
                        <th className="p-3">Event & Kreator</th>
                        <th className="p-3">Pendaftar (Buyer)</th>
                        <th className="p-3">Rekening Pengirim</th>
                        <th className="p-3">Total Bayar</th>
                        <th className="p-3">Distribusi Dana (Split Fee)</th>
                        <th className="p-3">Bukti Struk</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Tindakan Super Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminManualOrders
                        .filter(o => {
                          if (adminManualFilter === 'pending') return o.paymentStatus === 'pending_manual_verification';
                          if (adminManualFilter === 'paid') return o.paymentStatus === 'paid';
                          if (adminManualFilter === 'rejected') return o.paymentStatus === 'payment_rejected';
                          return true;
                        })
                        .map(order => {
                          const isPending = order.paymentStatus === 'pending_manual_verification';
                          const isPaid = order.paymentStatus === 'paid';
                          const isRejected = order.paymentStatus === 'payment_rejected';

                          const hargaAsli = order.hargaTiketAsli || order.subtotal;
                          const adminFee = order.biayaAdminUser || order.platformFee || 2000;
                          const komisiKreator = order.potonganKreator || Math.round(hargaAsli * 0.02);
                          const netKreator = order.netPendapatanKreator || (hargaAsli - komisiKreator);

                          return (
                            <tr key={order.id} className="hover:bg-slate-50">
                              <td className="p-3">
                                <span className="font-mono font-bold text-blue-700 block">{order.orderNumber}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              <td className="p-3 truncate max-w-[150px]">
                                <span className="font-medium text-slate-900 block truncate">{order.eventTitle}</span>
                                <span className="text-[10px] text-purple-700 block">{order.creatorName || 'Kreator Event'}</span>
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-slate-900 block">{order.buyerName}</span>
                                <span className="text-[10px] text-slate-500 block">{order.buyerPhone}</span>
                              </td>
                              <td className="p-3">
                                <span className="font-semibold text-slate-800 block">{order.senderBank || 'Bank Transfer'}</span>
                                <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">a.n {order.senderAccountName || order.buyerName}</span>
                              </td>
                              <td className="p-3 font-extrabold text-blue-700 text-sm">
                                {formatRupiah(order.totalAmount)}
                              </td>
                              <td className="p-3 text-[11px] space-y-0.5">
                                <div className="text-slate-600">
                                  Asli: <span className="font-semibold">{formatRupiah(hargaAsli)}</span>
                                </div>
                                <div className="text-emerald-700 font-bold">
                                  Net Kreator: {formatRupiah(netKreator)}
                                </div>
                                <div className="text-[10px] text-purple-700">
                                  Margin: {formatRupiah(adminFee + komisiKreator)} (Rp 2k + 2%)
                                </div>
                              </td>
                              <td className="p-3">
                                {order.paymentProofUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setAdminPreviewProof(order)}
                                    className="p-1 rounded-lg border border-slate-200 hover:border-blue-500 bg-white flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <img
                                      src={order.paymentProofUrl}
                                      alt="Bukti"
                                      className="w-8 h-8 object-cover rounded-md"
                                    />
                                    <span className="text-[10px] font-bold text-blue-600">Zoom</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Tidak ada foto</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isPending
                                    ? 'bg-amber-100 text-amber-800'
                                    : isPaid
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {isPending ? 'PENDING' : isPaid ? 'LUNAS' : 'DITOLAK'}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  {isPending ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleAdminApprove(order)}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                      >
                                        Setujui
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAdminRejectOrder(order);
                                          setAdminRejectReason('Bukti transfer tidak sesuai atau mutasi bank belum terdata');
                                        }}
                                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold border border-red-200 cursor-pointer"
                                      >
                                        Tolak
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">
                                      {isPaid ? 'Sudah Disetujui' : 'Sudah Ditolak'}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setOrderToDelete(order)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 border border-transparent hover:border-rose-200"
                                    title="Hapus Transaksi"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: MYSQL & HOSTING READY HUB */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Status Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Status Database & Kesiapan Hosting</h3>
                  <p className="text-xs text-slate-500">
                    Sistem dirancang 100% kompatibel dengan MySQL 5.7 / 8.0, MariaDB, dan driver MySQLi cPanel
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/api/download-package"
                  download="celebes-event-production.tar.gz"
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Paket Deploy (celebes-event-production.tar.gz)</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-slate-300"
                >
                  {isCopiedSql ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                  <span>{isCopiedSql ? 'Tersalin ke Clipboard!' : 'Salin Seluruh Kueri SQL'}</span>
                </button>
                <a
                  href="/api/export-sql"
                  download="celebes_event_mysql.sql"
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh SQL</span>
                </a>
              </div>
            </div>

            {/* Banner Penjelasan Error #1044 cPanel */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Penyelesaian Galat #1044 di phpMyAdmin cPanel:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Di cPanel hosting (IDwebhost), database Anda bernama <strong>bergulir_celebeseventok</strong>. Galat <em>#1044 Access denied to celebes_event_db</em> terjadi jika menggunakan file SQL lama yang memiliki perintah <code className="bg-amber-100 px-1 rounded text-red-700">CREATE DATABASE celebes_event_db;</code>.
              </p>
              <div className="text-[11px] bg-white/70 p-2.5 rounded-lg border border-amber-200 font-medium">
                ✅ <strong>Solusi Mudah (1 Detik):</strong> Buka tab <strong>SQL</strong> di phpMyAdmin (pastikan sedang membuka basis data <em>bergulir_celebeseventok</em>), lalu klik tombol <strong>"Salin Seluruh Kueri SQL"</strong> di atas, paste di kotak SQL phpMyAdmin, lalu klik <strong>Kirim (Go)</strong>. Semua 12 tabel & data awal akan langsung terbuat sempurna!
              </div>
            </div>

            {/* Live Database Info Card */}
            {dbStatus && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Mode Database:</span>
                  <span className="font-bold text-slate-900">{dbStatus.mode.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Host Terdaftar:</span>
                  <span className="font-mono font-bold text-slate-800 truncate block">{dbStatus.host}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Database Name:</span>
                  <span className="font-mono font-bold text-blue-700 truncate block">{dbStatus.database}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Status Koneksi:</span>
                  <span className={`font-bold ${dbStatus.connected ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {dbStatus.connected ? '✅ Terhubung ke MySQL' : '⚡ Local Resilient Engine Aktif'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Test MySQL Connection & Setup Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-600" />
                Uji Koneksi MySQL Hosting Secara Interaktif
              </h3>
              <p className="text-xs text-slate-500">
                Masukkan parameter database hosting cPanel / VPS Anda untuk menguji koneksi langsung dari server.
              </p>

              <form onSubmit={handleTestMysql} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Host MySQL</label>
                    <input
                      type="text"
                      value={mysqlHost}
                      onChange={(e) => setMysqlHost(e.target.value)}
                      placeholder="localhost"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Nama Database</label>
                    <input
                      type="text"
                      value={mysqlDb}
                      onChange={(e) => setMysqlDb(e.target.value)}
                      placeholder="bergulir_celebeseventok"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">User MySQL</label>
                    <input
                      type="text"
                      value={mysqlUser}
                      onChange={(e) => setMysqlUser(e.target.value)}
                      placeholder="bergulir_dbuser"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Password MySQL</label>
                    <input
                      type="password"
                      value={mysqlPass}
                      onChange={(e) => setMysqlPass(e.target.value)}
                      placeholder="Password database"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isTestingMysql}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {isTestingMysql ? 'Menguji Koneksi...' : 'Uji Koneksi Sekarang'}
                </button>
              </form>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Step-by-Step Deployment Guide Box */}
            <div className="lg:col-span-6 bg-slate-900 text-white rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Panduan Deploy ke cPanel Shared Hosting:</h3>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
                <li>
                  <strong>Import Database:</strong> Unduh file <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">schema.sql</code> lalu impor ke phpMyAdmin cPanel Anda.
                </li>
                <li>
                  <strong>Buka cPanel Node.js Selector:</strong> Klik <em>Setup Node.js App</em> di cPanel.
                </li>
                <li>
                  <strong>Pilih Versi Node:</strong> Pilih Node.js v18 / v20 / v22, set Application mode ke <em>Production</em>.
                </li>
                <li>
                  <strong>Upload & Install:</strong> Unggah file source code, klik <em>Run NPM Install</em>, lalu jalankan <code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded">npm run build</code>.
                </li>
                <li>
                  <strong>Set Environment:</strong> Masukkan kredensial MySQL di file <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">.env</code> lalu klik <em>Restart Application</em>.
                </li>
              </ol>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                📄 Panduan lengkap untuk VPS (PM2/Nginx) dan Docker tersedia di file <strong>database/deployment_guide.md</strong>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PENGATURAN PLATFORM & BRANDING */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSavePlatformSettings} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                  White-label & Brand Identity
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">Live Customizer</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Pengaturan Platform, Identitas Logo & Media Sosial
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Ubah nama platform, logo, deskripsi aplikasi, tautan akun medsos resmi, dan banner promo. Perubahan langsung aktif di seluruh halaman!
              </p>
            </div>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-purple-500/25 flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingSettings ? 'Menyimpan...' : 'Simpan Semua Perubahan'}</span>
            </button>
          </div>

          {settingsSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{settingsSuccessMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identitas Platform */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <Globe className="w-4 h-4 text-purple-600" />
                1. Identitas & Logo Platform
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Platform / Aplikasi *</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.platformName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, platformName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tagline Slogan *</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.tagline}
                    onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">URL Logo Aplikasi (Gambar PNG/SVG/WebP) *</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="url"
                      required
                      value={settingsForm.logoUrl}
                      onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                      className="flex-1 p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                    <div className="w-12 h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      <img src={settingsForm.logoUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Gunakan tautan logo transparan (rekomendasi rasio 1:1 atau 16:9).
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deskripsi Platform / Tentang Aplikasi *</label>
                  <textarea
                    rows={3}
                    required
                    value={settingsForm.description}
                    onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Kontak Resmi Platform */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <Headphones className="w-4 h-4 text-purple-600" />
                2. Kontak Resmi & Dukungan Pengguna
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Layanan Pelanggan *</label>
                  <input
                    type="email"
                    required
                    value={settingsForm.contactEmail}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor WhatsApp / Call Center *</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.contactPhone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactPhone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alamat Kantor Operasional *</label>
                  <textarea
                    rows={3}
                    required
                    value={settingsForm.contactAddress}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contactAddress: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Akun Sosial Media Platform */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <LinkIcon className="w-4 h-4 text-purple-600" />
                3. Informasi & Link Akun Media Sosial
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tautan Instagram</label>
                  <input
                    type="url"
                    value={settingsForm.socialLinks?.instagram || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        socialLinks: { ...settingsForm.socialLinks, instagram: e.target.value },
                      })
                    }
                    placeholder="https://instagram.com/akunresmi"
                    className="w-full p-2 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tautan WhatsApp Bisnis / Grup Komunitas</label>
                  <input
                    type="url"
                    value={settingsForm.socialLinks?.whatsapp || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        socialLinks: { ...settingsForm.socialLinks, whatsapp: e.target.value },
                      })
                    }
                    placeholder="https://wa.me/6281234567890"
                    className="w-full p-2 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">TikTok</label>
                    <input
                      type="url"
                      value={settingsForm.socialLinks?.tiktok || ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          socialLinks: { ...settingsForm.socialLinks, tiktok: e.target.value },
                        })
                      }
                      placeholder="https://tiktok.com/@akun"
                      className="w-full p-2 rounded-xl border border-slate-300 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">YouTube</label>
                    <input
                      type="url"
                      value={settingsForm.socialLinks?.youtube || ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          socialLinks: { ...settingsForm.socialLinks, youtube: e.target.value },
                        })
                      }
                      placeholder="https://youtube.com/@channel"
                      className="w-full p-2 rounded-xl border border-slate-300 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Facebook</label>
                    <input
                      type="url"
                      value={settingsForm.socialLinks?.facebook || ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          socialLinks: { ...settingsForm.socialLinks, facebook: e.target.value },
                        })
                      }
                      placeholder="https://facebook.com/fanpage"
                      className="w-full p-2 rounded-xl border border-slate-300 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">X (Twitter)</label>
                    <input
                      type="url"
                      value={settingsForm.socialLinks?.twitter || ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          socialLinks: { ...settingsForm.socialLinks, twitter: e.target.value },
                        })
                      }
                      placeholder="https://x.com/username"
                      className="w-full p-2 rounded-xl border border-slate-300 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">LinkedIn</label>
                    <input
                      type="url"
                      value={settingsForm.socialLinks?.linkedin || ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          socialLinks: { ...settingsForm.socialLinks, linkedin: e.target.value },
                        })
                      }
                      placeholder="https://linkedin.com/company/nama"
                      className="w-full p-2 rounded-xl border border-slate-300 text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tampilan Beranda (GoEvent.id Style Customizer) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <Image className="w-4 h-4 text-purple-600" />
                4. Tampilan Beranda & Banner Utama (Celebes Event Style)
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Headline Utama Beranda *</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.heroHeadline}
                    onChange={(e) => setSettingsForm({ ...settingsForm, heroHeadline: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subheadline Penjelas *</label>
                  <textarea
                    rows={2}
                    required
                    value={settingsForm.heroSubheadline}
                    onChange={(e) => setSettingsForm({ ...settingsForm, heroSubheadline: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">URL Background Banner Hero *</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="url"
                      required
                      value={settingsForm.heroBannerImage}
                      onChange={(e) => setSettingsForm({ ...settingsForm, heroBannerImage: e.target.value })}
                      className="flex-1 p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] text-slate-900"
                    />
                    <img
                      src={settingsForm.heroBannerImage}
                      alt="Hero Preview"
                      className="w-14 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teks Pengumuman Promo / Flash Banner</label>
                  <input
                    type="text"
                    value={settingsForm.announcementText || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, announcementText: e.target.value })}
                    placeholder="Contoh: Promo Spesial: Gunakan kode TIKETHEMAT untuk diskon 15%!"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* SEKSI 5: PENGATURAN POTONGAN KOMISI PLATFORM (FEE CONFIG) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">5. Pengaturan Potongan Komisi Platform (Platform Fee)</h3>
                    <p className="text-xs text-slate-500">Atur potongan dari event berbayar atau penarikan dana kreator (misal 2% atau Rp 2.000 tetap)</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                  {settingsForm.feeConfig?.feeType === 'percentage'
                    ? `Aktif: ${settingsForm.feeConfig.percentageValue}% Komisi`
                    : `Aktif: Rp${settingsForm.feeConfig?.fixedValue.toLocaleString('id-ID')} / Tiket`}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Model / Tipe Potongan Komisi *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        settingsForm.feeConfig?.feeType === 'percentage'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="feeType"
                          value="percentage"
                          checked={settingsForm.feeConfig?.feeType === 'percentage'}
                          onChange={() =>
                            setSettingsForm({
                              ...settingsForm,
                              feeConfig: {
                                ...(settingsForm.feeConfig || DEFAULT_PLATFORM_SETTINGS.feeConfig),
                                feeType: 'percentage',
                              },
                            })
                          }
                          className="text-emerald-600"
                        />
                        <span>Persentase (%)</span>
                      </label>

                      <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        settingsForm.feeConfig?.feeType === 'fixed'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="feeType"
                          value="fixed"
                          checked={settingsForm.feeConfig?.feeType === 'fixed'}
                          onChange={() =>
                            setSettingsForm({
                              ...settingsForm,
                              feeConfig: {
                                ...(settingsForm.feeConfig || DEFAULT_PLATFORM_SETTINGS.feeConfig),
                                feeType: 'fixed',
                              },
                            })
                          }
                          className="text-emerald-600"
                        />
                        <span>Nominal Tetap (Rp)</span>
                      </label>
                    </div>
                  </div>

                  {settingsForm.feeConfig?.feeType === 'percentage' ? (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Besaran Persentase Potongan (%) *</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="50"
                          required
                          value={settingsForm.feeConfig?.percentageValue ?? 2}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              feeConfig: {
                                ...(settingsForm.feeConfig || DEFAULT_PLATFORM_SETTINGS.feeConfig),
                                percentageValue: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute right-3.5 top-2.5 font-bold text-slate-400">%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Contoh: 2% berarti Rp20.000 dipotong dari setiap pencairan Rp1.000.000.
                      </span>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nominal Potongan Tetap (Rp) *</label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        required
                        value={settingsForm.feeConfig?.fixedValue ?? 2000}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            feeConfig: {
                              ...(settingsForm.feeConfig || DEFAULT_PLATFORM_SETTINGS.feeConfig),
                              fixedValue: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Contoh: Rp2.000 per tiket / transaksi penarikan dana.
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Keterangan / Kebijakan Potongan Platform</label>
                    <input
                      type="text"
                      value={settingsForm.feeConfig?.description || ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          feeConfig: {
                            ...(settingsForm.feeConfig || DEFAULT_PLATFORM_SETTINGS.feeConfig),
                            description: e.target.value,
                          },
                        })
                      }
                      placeholder="Contoh: Biaya komisi pemeliharaan platform tiket 2%"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                    />
                  </div>
                </div>

                {/* Simulasi Live Transparansi */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 text-xs block flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Simulasi Kalkulasi Transparansi (Contoh Pencairan Rp 5.000.000)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Rincian berikut adalah apa yang dilihat oleh kreator saat mengisi formulir penarikan dan apa yang tercatat di tabel admin:
                    </p>

                    {(() => {
                      const sampleGross = 5000000;
                      const isPct = settingsForm.feeConfig?.feeType === 'percentage';
                      const sampleDeduction = isPct 
                        ? Math.round(sampleGross * ((settingsForm.feeConfig?.percentageValue ?? 2) / 100))
                        : (settingsForm.feeConfig?.fixedValue ?? 2000);
                      const sampleNet = sampleGross - sampleDeduction;

                      return (
                        <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 text-[11px] mt-2">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Omzet Penarikan Kotor:</span>
                            <span className="font-semibold text-slate-900">{formatRupiah(sampleGross)}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>
                              Potongan Platform ({isPct ? `${settingsForm.feeConfig?.percentageValue}%` : `Tetap`}):
                            </span>
                            <span>-{formatRupiah(sampleDeduction)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-700 font-extrabold text-xs pt-1.5 border-t border-slate-100">
                            <span>Dana Bersih Diterima Kreator:</span>
                            <span>{formatRupiah(sampleNet)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <p className="text-[10px] text-slate-400 mt-3 italic">
                    *Semua nominal potongan disimpan secara otomatis dan ditampilkan transparan kepada kreator & super admin.
                  </p>
                </div>
              </div>
            </div>

            {/* SEKSI 6: PENGATURAN 4 LANGKAH MUDAH DAPATKAN TIKET */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 lg:col-span-2">
              <div className="border-b pb-3 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">6. Pengaturan 4 Langkah Mudah Dapatkan Tiket (Celebes Event)</h3>
                  <p className="text-xs text-slate-500">Sesuaikan judul, nomor urut, dan deskripsi panduan yang tampil di beranda depan</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {(settingsForm.howToSteps || DEFAULT_PLATFORM_SETTINGS.howToSteps).map((step, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">
                        {step.stepNumber}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">Langkah {idx + 1}</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">Judul Langkah *</label>
                      <input
                        type="text"
                        required
                        value={step.title}
                        onChange={(e) => {
                          const updated = [...(settingsForm.howToSteps || DEFAULT_PLATFORM_SETTINGS.howToSteps)];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setSettingsForm({ ...settingsForm, howToSteps: updated });
                        }}
                        className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">Deskripsi Singkat *</label>
                      <textarea
                        rows={3}
                        required
                        value={step.description}
                        onChange={(e) => {
                          const updated = [...(settingsForm.howToSteps || DEFAULT_PLATFORM_SETTINGS.howToSteps)];
                          updated[idx] = { ...updated[idx], description: e.target.value };
                          setSettingsForm({ ...settingsForm, howToSteps: updated });
                        }}
                        className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEKSI 7: PENGATURAN PAKET LAYANAN (PRICE LIST PAKET) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 lg:col-span-2">
              <div className="border-b pb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">7. Pengaturan Paket Layanan (Price List Paket - Celebes Event)</h3>
                  <p className="text-xs text-slate-500">Kelola 3 paket layanan: Platform Only (Rp500rb), Event Berbayar (2%), dan On Site Registration (Rp2jt)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                {(settingsForm.servicePackages || DEFAULT_PLATFORM_SETTINGS.servicePackages).map((pkg, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-sm">{pkg.name}</span>
                        {pkg.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                            {pkg.badge}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600">Nominal / Tarif</label>
                          <input
                            type="text"
                            value={pkg.price}
                            onChange={(e) => {
                              const updated = [...(settingsForm.servicePackages || DEFAULT_PLATFORM_SETTINGS.servicePackages)];
                              updated[idx] = { ...updated[idx], price: e.target.value };
                              setSettingsForm({ ...settingsForm, servicePackages: updated });
                            }}
                            className="w-full p-1.5 rounded-lg border border-slate-300 font-extrabold text-blue-700 bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600">Satuan</label>
                          <input
                            type="text"
                            value={pkg.priceSub}
                            onChange={(e) => {
                              const updated = [...(settingsForm.servicePackages || DEFAULT_PLATFORM_SETTINGS.servicePackages)];
                              updated[idx] = { ...updated[idx], priceSub: e.target.value };
                              setSettingsForm({ ...settingsForm, servicePackages: updated });
                            }}
                            className="w-full p-1.5 rounded-lg border border-slate-300 text-slate-600 bg-white text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600">Deskripsi Paket</label>
                        <input
                          type="text"
                          value={pkg.description}
                          onChange={(e) => {
                            const updated = [...(settingsForm.servicePackages || DEFAULT_PLATFORM_SETTINGS.servicePackages)];
                            updated[idx] = { ...updated[idx], description: e.target.value };
                            setSettingsForm({ ...settingsForm, servicePackages: updated });
                          }}
                          className="w-full p-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600">Catatan Khusus (Keterangan)</label>
                        <textarea
                          rows={2}
                          value={pkg.note}
                          onChange={(e) => {
                            const updated = [...(settingsForm.servicePackages || DEFAULT_PLATFORM_SETTINGS.servicePackages)];
                            updated[idx] = { ...updated[idx], note: e.target.value };
                            setSettingsForm({ ...settingsForm, servicePackages: updated });
                          }}
                          className="w-full p-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-emerald-800">Fitur Termasuk (1 baris per fitur)</label>
                        <textarea
                          rows={3}
                          value={pkg.featuresIncluded.join('\n')}
                          onChange={(e) => {
                            const updated = [...(settingsForm.servicePackages || DEFAULT_PLATFORM_SETTINGS.servicePackages)];
                            updated[idx] = { ...updated[idx], featuresIncluded: e.target.value.split('\n') };
                            setSettingsForm({ ...settingsForm, servicePackages: updated });
                          }}
                          className="w-full p-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white text-xs"
                        />
                      </div>

                      {pkg.organizerPrepared && (
                        <div>
                          <label className="block text-[10px] font-bold text-amber-800">Disiapkan Penyelenggara</label>
                          <textarea
                            rows={3}
                            value={pkg.organizerPrepared.join('\n')}
                            onChange={(e) => {
                              const updated = [...(settingsForm.servicePackages || DEFAULT_PLATFORM_SETTINGS.servicePackages)];
                              updated[idx] = { ...updated[idx], organizerPrepared: e.target.value.split('\n') };
                              setSettingsForm({ ...settingsForm, servicePackages: updated });
                            }}
                            className="w-full p-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEKSI 8: PENGATURAN TENTANG KAMI (ABOUT US) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 lg:col-span-2">
              <div className="border-b pb-3 flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">8. Pengaturan Tentang Kami (About Us, Visi, Misi & Metrik)</h3>
                  <p className="text-xs text-slate-500">Kelola cerita platform, nilai perusahaan, serta 4 highlight metrik di beranda</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Judul Utama Seksi *</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.aboutUs?.title || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        aboutUs: { ...(settingsForm.aboutUs || DEFAULT_PLATFORM_SETTINGS.aboutUs), title: e.target.value },
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subtitle / Slogan Penjelas *</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.aboutUs?.subtitle || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        aboutUs: { ...(settingsForm.aboutUs || DEFAULT_PLATFORM_SETTINGS.aboutUs), subtitle: e.target.value },
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Cerita / Deskripsi Lengkap Tentang Kami *</label>
                  <textarea
                    rows={3}
                    required
                    value={settingsForm.aboutUs?.story || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        aboutUs: { ...(settingsForm.aboutUs || DEFAULT_PLATFORM_SETTINGS.aboutUs), story: e.target.value },
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Visi Platform *</label>
                  <textarea
                    rows={2}
                    required
                    value={settingsForm.aboutUs?.vision || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        aboutUs: { ...(settingsForm.aboutUs || DEFAULT_PLATFORM_SETTINGS.aboutUs), vision: e.target.value },
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Misi Platform *</label>
                  <textarea
                    rows={2}
                    required
                    value={settingsForm.aboutUs?.mission || ''}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        aboutUs: { ...(settingsForm.aboutUs || DEFAULT_PLATFORM_SETTINGS.aboutUs), mission: e.target.value },
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* SEKSI 9: PENGATURAN GALERI DOKUMENTASI KEGIATAN */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">9. Pengaturan Galeri Dokumentasi Kegiatan Event</h3>
                    <p className="text-xs text-slate-500">Foto dokumentasi kegiatan yang tampil di halaman depan beranda</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const currentGal = settingsForm.gallery || DEFAULT_PLATFORM_SETTINGS.gallery;
                    const newId = `gal-${Date.now()}`;
                    setSettingsForm({
                      ...settingsForm,
                      gallery: [
                        ...currentGal,
                        {
                          id: newId,
                          title: 'Dokumentasi Event Baru',
                          category: 'Festival & Musik',
                          imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
                        },
                      ],
                    });
                  }}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Foto Galeri</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                {(settingsForm.gallery || DEFAULT_PLATFORM_SETTINGS.gallery).map((item, idx) => (
                  <div key={item.id || idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="aspect-16/9 rounded-lg overflow-hidden bg-slate-200 relative">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (settingsForm.gallery || DEFAULT_PLATFORM_SETTINGS.gallery).filter((_, i) => i !== idx);
                          setSettingsForm({ ...settingsForm, gallery: updated });
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/80 text-white hover:bg-red-700 cursor-pointer"
                        title="Hapus Foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="url"
                      value={item.imageUrl}
                      onChange={(e) => {
                        const updated = [...(settingsForm.gallery || DEFAULT_PLATFORM_SETTINGS.gallery)];
                        updated[idx] = { ...updated[idx], imageUrl: e.target.value };
                        setSettingsForm({ ...settingsForm, gallery: updated });
                      }}
                      placeholder="URL Gambar..."
                      className="w-full p-1.5 rounded-lg border border-slate-300 text-[11px] bg-white font-mono"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...(settingsForm.gallery || DEFAULT_PLATFORM_SETTINGS.gallery)];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setSettingsForm({ ...settingsForm, gallery: updated });
                        }}
                        placeholder="Judul Event"
                        className="w-full p-1.5 rounded-lg border border-slate-300 text-xs bg-white font-semibold"
                      />
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => {
                          const updated = [...(settingsForm.gallery || DEFAULT_PLATFORM_SETTINGS.gallery)];
                          updated[idx] = { ...updated[idx], category: e.target.value };
                          setSettingsForm({ ...settingsForm, gallery: updated });
                        }}
                        placeholder="Kategori"
                        className="w-full p-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 8: GATEWAY & API QRIS */}
      {activeTab === 'qris-api' && (
        <form onSubmit={handleSaveQrisConfig} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  Bank Indonesia QRIS MPM & Aggregator Ready
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">Auto Payment Settlement</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Konfigurasi Gateway & API Pembayaran QRIS Otomatis
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Masukkan API Key, Merchant ID, dan Secret Key untuk mengaktifkan pemindaian QRIS dinamis/otomatis dari BCA, Mandiri, BRI, BNI, GoPay, OVO, ShopeePay, dan DANA.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                disabled={isTestingMidtrans}
                onClick={handleTestQrisPing}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2 border border-slate-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingMidtrans ? 'animate-spin text-blue-600' : ''}`} />
                <span>{isTestingMidtrans ? 'Menguji API...' : 'Uji Kredensial Midtrans'}</span>
              </button>
              <button
                type="submit"
                disabled={isSavingQris}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/25 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingQris ? 'Menyimpan...' : 'Simpan Kredensial QRIS'}</span>
              </button>
            </div>
          </div>

          {qrisTestResult && (
            <div className={`p-4 rounded-2xl text-xs font-mono border flex items-start gap-3 ${
              qrisTestResult.includes('❌') || qrisTestResult.includes('⚠️')
                ? 'bg-rose-950 text-rose-100 border-rose-800'
                : 'bg-slate-900 text-white border-slate-800'
            }`}>
              <QrCode className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-emerald-400 block mb-0.5">Diagnostik API Gateway Midtrans:</span>
                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{qrisTestResult}</p>
                {midtransTestDetails && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-0.5">
                    <div>Status HTTP: <strong className="text-white">{midtransTestDetails.httpStatus}</strong> ({midtransTestDetails.endpoint})</div>
                    <div>Mode: <strong className="text-white">{midtransTestDetails.isSandbox ? 'Sandbox (Uji Coba)' : 'Production (Live)'}</strong></div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Setting Form */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <QrCode className="w-4 h-4 text-emerald-600" />
                Kredensial Akun Merchant & API Provider
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Penyedia Layanan / Payment Gateway *</label>
                  <select
                    value={settingsForm.qrisConfig.provider}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        qrisConfig: {
                          ...settingsForm.qrisConfig,
                          provider: e.target.value as any,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="midtrans">Midtrans Payment Gateway (QRIS, VA BCA, Mandiri, BRI, BNI)</option>
                    <option value="xendit">Xendit Indonesia (QRIS Dinamis, E-Wallet, VA)</option>
                    <option value="doku">DOKU Payment Solution (QRIS & Multi-bank)</option>
                    <option value="bi_qris">Bank Indonesia QRIS MPM Standar Nasional</option>
                    <option value="manual">Sistem Manual / Semi-Automated Only</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Merchant ID *</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.qrisConfig.merchantId}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          qrisConfig: { ...settingsForm.qrisConfig, merchantId: e.target.value },
                        })
                      }
                      placeholder="Contoh: M-CELEBES-882190"
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Client Key / Public Key *</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.qrisConfig.clientKey}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          qrisConfig: { ...settingsForm.qrisConfig, clientKey: e.target.value },
                        })
                      }
                      placeholder="Contoh: SB-Mid-client-XXXXX"
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Server Key / Secret API Key *</label>
                  <input
                    type="password"
                    required
                    value={settingsForm.qrisConfig.serverKey}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        qrisConfig: { ...settingsForm.qrisConfig, serverKey: e.target.value },
                      })
                    }
                    placeholder="Contoh: SB-Mid-server-YYYYY"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Kunci ini disimpan aman di sisi server untuk memvalidasi notifikasi webhook pembayaran lunas.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Webhook URL Notification (Midtrans MAP)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/api/midtrans/notification`}
                      className="flex-1 p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-600 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/midtrans/notification`);
                        alert('URL Webhook Midtrans berhasil disalin ke clipboard!');
                      }}
                      className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                      title="Salin Webhook URL"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Tempel URL ini pada dashboard <strong>Midtrans MAP (Merchant Administration Portal) &gt; Settings &gt; Configuration &gt; Payment Notification URL</strong>.
                  </span>
                </div>

                {/* Toggles */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.qrisConfig.isSandbox}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          qrisConfig: { ...settingsForm.qrisConfig, isSandbox: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Sandbox Mode (Uji Coba)</span>
                      <span className="text-[10px] text-slate-500">Gunakan simulator tanpa transaksi uang asli</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.qrisConfig.isEnabled}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          qrisConfig: { ...settingsForm.qrisConfig, isEnabled: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Aktifkan QRIS di Checkout</span>
                      <span className="text-[10px] text-slate-500">Tampilkan opsi pembayaran QRIS pada peserta</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm text-white">Panduan Integrasi Gateway QRIS</h4>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p>
                  Celebes Event mendukung penerimaan pembayaran otomatis berstandar <strong>QRIS Nasional</strong> (Bank Indonesia). Peserta dapat membayar menggunakan aplikasi m-Banking manapun:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                  <div className="bg-white/10 p-2 rounded-lg">• BCA Mobile & Sakuku</div>
                  <div className="bg-white/10 p-2 rounded-lg">• Livin' Mandiri</div>
                  <div className="bg-white/10 p-2 rounded-lg">• BRImo (Bank BRI)</div>
                  <div className="bg-white/10 p-2 rounded-lg">• BNI Mobile</div>
                  <div className="bg-white/10 p-2 rounded-lg">• GoPay & OVO</div>
                  <div className="bg-white/10 p-2 rounded-lg">• ShopeePay & DANA</div>
                </div>

                <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-200 text-xs">
                  ✅ Tiket otomatis diterbitkan secara instan setelah scanner QRIS pembeli mengonfirmasi pembayaran sukses.
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 9: PUSAT BANTUAN & KENDALA PENGGUNA */}
      {activeTab === 'support-desk' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                  Layanan Pengaduan & CS Helpdesk
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">
                  {supportTickets.filter(t => t.status === 'open').length} Menunggu Tanggapan
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Pusat Bantuan & Pemantauan Laporan Kendala
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Super admin dapat meninjau keluhan tiket/pembayaran peserta, membalas solusi, dan memperbarui status tiket kendala.
              </p>
            </div>

            {/* Filter status */}
            <div className="flex items-center gap-1.5 overflow-x-auto self-start sm:self-auto">
              <button
                onClick={() => setSupportFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  supportFilter === 'all'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({supportTickets.length})
              </button>
              <button
                onClick={() => setSupportFilter('open')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  supportFilter === 'open'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Menunggu ({supportTickets.filter(t => t.status === 'open').length})
              </button>
              <button
                onClick={() => setSupportFilter('in_progress')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  supportFilter === 'in_progress'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Diproses ({supportTickets.filter(t => t.status === 'in_progress').length})
              </button>
              <button
                onClick={() => setSupportFilter('resolved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  supportFilter === 'resolved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Selesai ({supportTickets.filter(t => t.status === 'resolved').length})
              </button>
            </div>
          </div>

          {/* Support Tickets Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-3">No. Tiket</th>
                    <th className="p-3">Pelapor</th>
                    <th className="p-3">Kategori & Urgensi</th>
                    <th className="p-3">Subjek & Masalah</th>
                    <th className="p-3">Waktu Masuk</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Tindakan Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supportTickets
                    .filter(t => (supportFilter === 'all' ? true : t.status === supportFilter))
                    .map(ticket => (
                      <tr key={ticket.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-blue-700">{ticket.ticketNumber}</td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{ticket.name}</span>
                          <span className="text-[10px] text-slate-500 block">{ticket.email}</span>
                          {ticket.phone && <span className="text-[10px] text-slate-400 block">{ticket.phone}</span>}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 capitalize block">{ticket.category}</span>
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              ticket.priority === 'tinggi'
                                ? 'bg-red-100 text-red-700'
                                : ticket.priority === 'sedang'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Urgensi: {ticket.priority}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs">
                          <span className="font-bold text-slate-900 block truncate">{ticket.subject}</span>
                          <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{ticket.message}</p>
                          {ticket.adminReply && (
                            <div className="mt-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <strong>Balasan:</strong> {ticket.adminReply}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {new Date(ticket.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ticket.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ticket.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ticket.status === 'resolved'
                              ? 'SELESAI'
                              : ticket.status === 'in_progress'
                              ? 'DIPROSES'
                              : 'MENUNGGU'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedTicketForReply(ticket);
                                setAdminReplyText(ticket.adminReply || '');
                                setAdminReplyStatus(ticket.status === 'resolved' ? 'resolved' : 'in_progress');
                              }}
                              className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg border border-purple-200 text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Tanggapi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSupportToDelete(ticket)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 border border-transparent hover:border-rose-200"
                              title="Hapus Tiket Kendala"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BALAS KENDALA OLEH SUPER ADMIN */}
      {selectedTicketForReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                  Tanggapan Pusat Bantuan
                </span>
                <h4 className="font-bold text-sm text-white">
                  Tiket #{selectedTicketForReply.ticketNumber} • {selectedTicketForReply.name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedTicketForReply(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdminReply} className="p-6 space-y-4 flex-1 overflow-y-auto text-xs">
              {/* Detail Pertanyaan Pelapor */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{selectedTicketForReply.subject}</span>
                  <span className="capitalize text-slate-500 font-normal">Kategori: {selectedTicketForReply.category}</span>
                </div>
                <p className="text-slate-600 whitespace-pre-line leading-relaxed">{selectedTicketForReply.message}</p>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                  Pelapor: {selectedTicketForReply.name} ({selectedTicketForReply.email}) {selectedTicketForReply.phone && `• ${selectedTicketForReply.phone}`}
                </div>
              </div>

              {/* Form Balasan Admin */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pesan Tanggapan / Solusi Resmi Super Admin *
                </label>
                <textarea
                  rows={4}
                  required
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  placeholder="Tuliskan solusi, link tiket, atau konfirmasi penyelesaian kendala di sini..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Perbarui Status Tiket Kendala</label>
                <select
                  value={adminReplyStatus}
                  onChange={(e) => setAdminReplyStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold"
                >
                  <option value="in_progress">Sedang Diproses / Butuh Verifikasi Lanjutan</option>
                  <option value="resolved">Selesai (Resolved) - Masalah Teratasi</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTicketForReply(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReply}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingReply ? 'Mengirim...' : 'Kirim Tanggapan Bantuan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW BUKTI TRANSFER SUPER ADMIN */}
      {adminPreviewProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                  Super Admin • Verifikasi Bukti Struk
                </span>
                <h4 className="font-bold text-sm text-white">
                  Order {adminPreviewProof.orderNumber} • {formatRupiah(adminPreviewProof.totalAmount)}
                </h4>
              </div>
              <button
                onClick={() => setAdminPreviewProof(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-center">
              <div className="bg-slate-100 rounded-2xl p-2 max-h-[50vh] overflow-hidden flex items-center justify-center border border-slate-200">
                <img
                  src={adminPreviewProof.paymentProofUrl}
                  alt="Bukti Transfer Penuh"
                  className="max-h-[48vh] w-auto object-contain rounded-xl shadow-xs"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl text-left text-xs space-y-2 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pendaftar:</span>
                  <span className="font-bold text-slate-800">{adminPreviewProof.buyerName} ({adminPreviewProof.buyerEmail})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Event & Kreator:</span>
                  <span className="font-bold text-slate-800">{adminPreviewProof.eventTitle} ({adminPreviewProof.creatorName || 'Kreator'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Pengirim:</span>
                  <span className="font-bold text-slate-800">{adminPreviewProof.senderBank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pemilik Rekening:</span>
                  <span className="font-bold text-slate-800">{adminPreviewProof.senderAccountName}</span>
                </div>
                {adminPreviewProof.transferNotes && (
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-500">Catatan Pengirim:</span>
                    <span className="italic">{adminPreviewProof.transferNotes}</span>
                  </div>
                )}

                {/* Financial Split Fee Breakdown (Blueprint v3) */}
                <div className="pt-2 border-t border-slate-200 space-y-1.5 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                  <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                    Distribusi Finansial & Bagi Hasil (Blueprint v3)
                  </span>
                  
                  {(() => {
                    const hargaAsli = adminPreviewProof.hargaTiketAsli || adminPreviewProof.subtotal;
                    const adminFee = adminPreviewProof.biayaAdminUser || adminPreviewProof.platformFee || 2000;
                    const komisiKreator = adminPreviewProof.potonganKreator || Math.round(hargaAsli * 0.02);
                    const netKreator = adminPreviewProof.netPendapatanKreator || (hargaAsli - komisiKreator);
                    const totalMargin = adminPreviewProof.totalMarginPlatform || (adminFee + komisiKreator);

                    return (
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between text-slate-600">
                          <span>Harga Tiket Asli:</span>
                          <span className="font-semibold text-slate-900">{formatRupiah(hargaAsli)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Biaya Admin Platform (User):</span>
                          <span className="font-semibold text-blue-700">+{formatRupiah(adminFee)}</span>
                        </div>
                        <div className="flex justify-between text-slate-700 font-bold pt-1 border-t border-purple-100">
                          <span>Total Tagihan Dibayar User:</span>
                          <span className="text-blue-800">{formatRupiah(adminPreviewProof.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-purple-700">
                          <span>Komisi Platform (2% dari Kreator):</span>
                          <span>{formatRupiah(komisiKreator)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-purple-100">
                          <span>Alokasi Saldo Dompet Kreator:</span>
                          <span className="text-emerald-800 font-extrabold">{formatRupiah(netKreator)}</span>
                        </div>
                        <div className="flex justify-between text-purple-950 font-bold">
                          <span>Total Margin Platform (Celebes Event):</span>
                          <span className="text-purple-700 font-extrabold">{formatRupiah(totalMargin)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setAdminPreviewProof(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl"
              >
                Tutup
              </button>

              {adminPreviewProof.paymentStatus === 'pending_manual_verification' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminRejectOrder(adminPreviewProof);
                      setAdminPreviewProof(null);
                    }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 cursor-pointer"
                  >
                    Tolak Pembayaran
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminApprove(adminPreviewProof)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Setujui & Terbitkan Tiket
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TOLAK PEMBAYARAN SUPER ADMIN */}
      {adminRejectOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-base text-slate-900">Tolak Pembayaran Manual</h3>
            </div>

            <p className="text-xs text-slate-600">
              Masukkan alasan penolakan untuk pesanan <strong>{adminRejectOrder.orderNumber}</strong>. Alasan ini akan tampil di dashboard pendaftar.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alasan Penolakan *</label>
              <textarea
                rows={3}
                required
                value={adminRejectReason}
                onChange={(e) => setAdminRejectReason(e.target.value)}
                placeholder="Contoh: Bukti transfer tidak valid atau dana belum masuk."
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdminRejectOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAdminReject}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Tolak Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS TRANSAKSI (ORDER) */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
                <Trash2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Transaksi</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Menghapus transaksi ini akan membatalkan seluruh tiket di dalamnya dan mengembalikan kuota tiket ke event terkait secara permanen.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left text-xs space-y-1 font-mono">
                <div><strong className="font-sans text-slate-700">Nomor Order:</strong> <span className="font-bold text-blue-700">{orderToDelete.orderNumber}</span></div>
                <div><strong className="font-sans text-slate-700">Pembeli:</strong> {orderToDelete.buyerName} ({orderToDelete.buyerPhone})</div>
                <div><strong className="font-sans text-slate-700">Event:</strong> {orderToDelete.eventTitle}</div>
                <div><strong className="font-sans text-slate-700">Total:</strong> {formatRupiah(orderToDelete.totalAmount)} ({orderToDelete.paymentStatus.toUpperCase()})</div>
                <div><strong className="font-sans text-slate-700">Jumlah Tiket:</strong> {orderToDelete.tickets.length} Tiket</div>
              </div>

              {deleteOrderError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium border border-rose-200">
                  {deleteOrderError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingOrder}
                  onClick={() => setOrderToDelete(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingOrder}
                  onClick={handleDeleteOrder}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingOrder ? 'Menghapus...' : 'Ya, Hapus Transaksi'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS EVENT */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
                <Trash2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Event</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Apakah Anda yakin ingin menghapus event ini? Seluruh data tiket, tier pendaftaran, dan formulir event akan terhapus permanen dari sistem.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left text-xs space-y-1">
                <div className="font-bold text-slate-900">{eventToDelete.title}</div>
                <div className="text-slate-600 text-[11px]">Kategori: {eventToDelete.category} • Kreator: {eventToDelete.creatorName}</div>
                <div className="text-slate-500 text-[11px]">
                  Terjual: {eventToDelete.tickets.reduce((acc, t) => acc + (t.soldCount || 0), 0)} / {eventToDelete.tickets.reduce((acc, t) => acc + t.quota, 0)} kuota
                </div>
              </div>

              {deleteEventError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium border border-rose-200">
                  {deleteEventError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingEvent}
                  onClick={() => setEventToDelete(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingEvent}
                  onClick={handleDeleteEvent}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingEvent ? 'Menghapus...' : 'Ya, Hapus Event'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS PAYOUT */}
      {payoutToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
                <Trash2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Pengajuan Pencairan</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Apakah Anda yakin ingin menghapus catatan pengajuan pencairan dana ini?
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left text-xs space-y-1">
                <div className="font-bold text-slate-900">{payoutToDelete.creatorName}</div>
                <div className="text-slate-600 text-[11px]">Event: {payoutToDelete.eventTitle}</div>
                <div className="font-extrabold text-emerald-700">{formatRupiah(payoutToDelete.netAmount || payoutToDelete.amount)}</div>
                <div className="text-slate-500 text-[11px] font-mono">{payoutToDelete.bankName} - {payoutToDelete.accountNumber} ({payoutToDelete.accountName})</div>
              </div>

              {deletePayoutError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium border border-rose-200">
                  {deletePayoutError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingPayout}
                  onClick={() => setPayoutToDelete(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingPayout}
                  onClick={handleDeletePayout}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingPayout ? 'Menghapus...' : 'Ya, Hapus'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS SUPPORT TICKET */}
      {supportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
                <Trash2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Tiket Pengaduan</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Apakah Anda yakin ingin menghapus tiket bantuan kendala ini dari daftar?
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left text-xs space-y-1">
                <div className="font-bold text-blue-700 font-mono">{supportToDelete.ticketNumber}</div>
                <div className="font-bold text-slate-900">{supportToDelete.subject}</div>
                <div className="text-slate-600 text-[11px]">Pelapor: {supportToDelete.name} ({supportToDelete.email})</div>
              </div>

              {deleteSupportError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium border border-rose-200">
                  {deleteSupportError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeletingSupport}
                  onClick={() => setSupportToDelete(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingSupport}
                  onClick={handleDeleteSupportTicket}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingSupport ? 'Menghapus...' : 'Ya, Hapus Tiket'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
