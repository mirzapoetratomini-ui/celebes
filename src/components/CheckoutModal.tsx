import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  QrCode, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  ArrowRight, 
  Copy, 
  Check, 
  Sparkles,
  Shield,
  Smartphone,
  Upload,
  User as UserIcon,
  Clock,
  FileImage,
  Info,
  DollarSign,
  RefreshCw,
  ExternalLink,
  Lock
} from 'lucide-react';
import QRCode from 'qrcode';
import { EventItem, Order, TicketTier, User, PaymentMethod, Ticket, Voucher, PlatformSettings, ManualBankAccount } from '../types';
import { calculateOrderTotals, formatRupiah, generateTicketCode, generateQrPayload, validateCustomResponses } from '../utils/ticketing-logic';
import { api } from '../services/api';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  selectedTickets: { tier: TicketTier; quantity: number }[];
  currentUser: User;
  platformSettings?: PlatformSettings;
  onOrderCompleted: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  event,
  selectedTickets,
  currentUser,
  platformSettings,
  onOrderCompleted,
}) => {
  // Step 1: Form & Custom Fields; Step 2: Payment
  const [step, setStep] = useState<1 | 2>(1);

  // Buyer Info
  const [buyerName, setBuyerName] = useState(currentUser.name || 'Budi Santoso');
  const [buyerEmail, setBuyerEmail] = useState(currentUser.email || 'budi.santoso@gmail.com');
  const [buyerPhone, setBuyerPhone] = useState(currentUser.phone || '085712345678');

  // Dynamic responses: [fieldId] -> answer
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({
    'cf-001': 'Universitas Indonesia',
    'cf-002': 'L',
    'cf-003': 'Halal / Standar',
    'cf-004': 'Bandung Community',
    'cf-006': '081299887766',
    'cf-007': 'Optimasi konversi penjualan dan leads digital',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Voucher
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherSuccess, setVoucherSuccess] = useState<string | null>(null);

  // Payment Type Mode: Otomatis vs Manual
  const [paymentType, setPaymentType] = useState<'automatic' | 'manual'>('automatic');

  // Automatic Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [paymentChannel, setPaymentChannel] = useState<string>('QRIS Dinamis (ShopeePay/GoPay/BCA/Dana)');
  const [simulatedQrisUrl, setSimulatedQrisUrl] = useState<string>('');
  const [simulatedVaNumber, setSimulatedVaNumber] = useState<string>('');
  const [copiedVa, setCopiedVa] = useState(false);

  // Midtrans Live Transaction State
  const [activePendingOrder, setActivePendingOrder] = useState<Order | null>(null);
  const [midtransSnapToken, setMidtransSnapToken] = useState<string | null>(null);
  const [midtransRedirectUrl, setMidtransRedirectUrl] = useState<string | null>(null);
  const [midtransMode, setMidtransMode] = useState<string>('simulator');
  const [isCreatingMidtrans, setIsCreatingMidtrans] = useState(false);
  const [isCheckingMidtransStatus, setIsCheckingMidtransStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isStatusSuccess, setIsStatusSuccess] = useState(false);

  // Dynamic Manual Bank Accounts from platformSettings master data (Blueprint v3)
  const activeBankAccounts: ManualBankAccount[] = React.useMemo(() => {
    if (platformSettings?.manualBankAccounts && platformSettings.manualBankAccounts.length > 0) {
      const activeOnly = platformSettings.manualBankAccounts.filter(b => b.isActive !== false);
      if (activeOnly.length > 0) return activeOnly;
    }
    return [
      { id: 'bank-bca', bankName: 'Bank BCA', bankCode: 'BCA', accountNumber: '888-019-2831', accountName: 'PT CELEBES EVENT DIGITAL', isActive: true, notes: 'Verifikasi via m-BCA, myBCA, KlikBCA, atau ATM BCA' },
      { id: 'bank-mandiri', bankName: 'Bank Mandiri', bankCode: 'MANDIRI', accountNumber: '137-00-19283-912', accountName: 'CELEBES EVENT INDONESIA', isActive: true, notes: 'Transfer via Livin by Mandiri atau ATM Mandiri' },
      { id: 'bank-bsi', bankName: 'Bank BSI (Syariah)', bankCode: 'BSI', accountNumber: '719-283-0012', accountName: 'CELEBES EVENT SYARIAH', isActive: true, notes: 'Transfer syariah via BSI Mobile atau ATM Bersama' },
    ];
  }, [platformSettings?.manualBankAccounts]);

  const [selectedBankId, setSelectedBankId] = useState<string>('bank-bca');

  React.useEffect(() => {
    if (activeBankAccounts.length > 0 && !activeBankAccounts.some(b => b.id === selectedBankId)) {
      setSelectedBankId(activeBankAccounts[0].id);
    }
  }, [activeBankAccounts, selectedBankId]);

  const selectedBankAccount = activeBankAccounts.find(b => b.id === selectedBankId) || activeBankAccounts[0] || {
    id: 'bank-bca',
    bankName: 'Bank BCA',
    bankCode: 'BCA',
    accountNumber: '888-019-2831',
    accountName: 'PT CELEBES EVENT DIGITAL',
    isActive: true,
  };

  const [senderBank, setSenderBank] = useState('Bank BCA');
  const [senderAccountName, setSenderAccountName] = useState(currentUser.name || 'Budi Santoso');
  const [transferProofUrl, setTransferProofUrl] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState('');
  const [manualFormError, setManualFormError] = useState<string | null>(null);
  const [copiedAccountNo, setCopiedAccountNo] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // 15-Minute Expiry Countdown Timer (Blueprint v3: custom_expiry 15 minutes)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  React.useEffect(() => {
    if (step !== 2) return;
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsSessionExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Flattened tickets list for registration
  const flattenedTickets: { tier: TicketTier; index: number }[] = [];
  selectedTickets.forEach(item => {
    for (let i = 0; i < item.quantity; i++) {
      flattenedTickets.push({ tier: item.tier, index: flattenedTickets.length + 1 });
    }
  });

  // Calculate Totals per Blueprint v3: User pays Base Price + Flat Rp 2.000 Platform Admin Fee
  const orderCalcItems = selectedTickets.map(item => ({
    price: item.tier.price,
    quantity: item.quantity,
  }));

  const totals = calculateOrderTotals(
    orderCalcItems,
    appliedVoucher
      ? { discountType: appliedVoucher.discountType, discountValue: appliedVoucher.discountValue }
      : null,
    { fixed: 2000, percentage: 0 }
  );

  if (!isOpen || !event) return null;

  // Handle Voucher Apply
  const handleApplyVoucher = async () => {
    if (!voucherCodeInput.trim()) return;
    setVoucherError(null);
    setVoucherSuccess(null);

    const res = await api.validateVoucher(voucherCodeInput, event.id);
    if (res.valid && res.voucher) {
      setAppliedVoucher(res.voucher);
      setVoucherSuccess(`Kupon "${res.voucher.code}" berhasil diterapkan!`);
    } else {
      setVoucherError(res.message || 'Kupon tidak valid');
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherSuccess(null);
    setVoucherCodeInput('');
  };

  // Move from Step 1 to Step 2
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateCustomResponses(event.customFields, customResponses);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    setFormErrors({});

    // Generate dynamic QRIS or Virtual Account
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const vaNum = `8808${randomSuffix}`;
    setSimulatedVaNumber(vaNum);

    try {
      const qrisPayload = `00020101021226610014ID.LINKAJA.WWW01189360091800000000000215${totals.totalAmount}53033605802ID5920CELEBES EVENT PLATFORM6008MAKASSAR`;
      const qrUrl = await QRCode.toDataURL(qrisPayload, { width: 240, margin: 2 });
      setSimulatedQrisUrl(qrUrl);
    } catch {
      // fallback
    }

    setStep(2);
  };

  // Handle manual file upload preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setTransferProofUrl(reader.result);
          setManualFormError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Fast sample proof simulation
  const handleUseSampleProof = () => {
    const sampleReceipt = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80';
    setTransferProofUrl(sampleReceipt);
    setManualFormError(null);
  };

  // Helper to construct tickets
  const buildTicketObjects = (orderNumber: string) => {
    return flattenedTickets.map((t, idx) => {
      const ticketCode = generateTicketCode(event.slug, idx + 1);
      const qrPayload = generateQrPayload(ticketCode, event.id, buyerEmail);
      
      const responses = event.customFields.map(f => ({
        id: `resp-${Date.now()}-${f.id}-${idx}`,
        ticketId: `tkt-${Date.now()}-${idx}`,
        fieldId: f.id,
        fieldLabel: f.label,
        responseValue: customResponses[f.id] || '-',
      }));

      return {
        id: `tkt-${Date.now()}-${idx}`,
        orderId: `ord-${Date.now()}`,
        eventId: event.id,
        eventTitle: event.title,
        tierId: t.tier.id,
        tierName: t.tier.name,
        ticketCode,
        qrPayload,
        attendeeName: buyerName,
        attendeeEmail: buyerEmail,
        checkInStatus: 'not_checked_in' as const,
        createdAt: new Date().toISOString(),
        responses,
      };
    });
  };

  // 1. Create Pending Automatic Order & Initiate Midtrans Snap
  const handleStartAutomaticPayment = async () => {
    setIsCreatingMidtrans(true);
    setStatusMessage(null);
    setIsStatusSuccess(false);

    try {
      const orderNumber = activePendingOrder?.orderNumber || `CE-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      let currentOrder = activePendingOrder;
      if (!currentOrder) {
        const createdTickets = buildTicketObjects(orderNumber);
        const orderPayload: Partial<Order> = {
          orderNumber,
          userId: currentUser.id,
          eventId: event.id,
          eventTitle: event.title,
          creatorId: event.creatorId,
          creatorName: event.creatorName,
          buyerName,
          buyerEmail,
          buyerPhone,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          platformFee: totals.platformFee,
          totalAmount: totals.totalAmount,
          paymentType: 'automatic',
          paymentMethod,
          paymentChannel,
          paymentStatus: 'pending', // NEVER paid upon creation!
          paymentReference: paymentMethod === 'qris' ? `QRIS-${Date.now()}` : `VA-${simulatedVaNumber}`,
          tickets: createdTickets,
        };
        currentOrder = await api.createOrder(orderPayload);
        setActivePendingOrder(currentOrder);
      }

      // Call Midtrans Snap Session Generator
      const snapRes = await api.createMidtransSnapTransaction({
        orderNumber: currentOrder.orderNumber,
        grossAmount: currentOrder.totalAmount,
        buyerName: currentOrder.buyerName,
        buyerEmail: currentOrder.buyerEmail,
        buyerPhone: currentOrder.buyerPhone,
        items: selectedTickets.map(item => ({
          id: item.tier.id,
          name: `${event.title} - ${item.tier.name}`,
          price: item.tier.price,
          quantity: item.quantity,
        })),
      });

      if (snapRes.success && snapRes.token) {
        setMidtransSnapToken(snapRes.token);
        setMidtransRedirectUrl(snapRes.redirectUrl || null);
        setMidtransMode('midtrans_snap');
        setStatusMessage('Sesi Midtrans aktif! Silakan bayar menggunakan tombol Midtrans di bawah atau scan QR.');
      } else {
        setMidtransMode('simulator');
        setStatusMessage('Tagihan pembayaran siap. Silakan selesaikan pembayaran lalu tekan "Cek Status Pembayaran".');
      }
    } catch (err: any) {
      setStatusMessage('Gagal membuat tagihan: ' + err.message);
    } finally {
      setIsCreatingMidtrans(false);
    }
  };

  // 2. Check Midtrans Payment Status
  const handleCheckPaymentStatus = async () => {
    if (!activePendingOrder) {
      setStatusMessage('Harap klik "Buat Tagihan Pembayaran" terlebih dahulu.');
      return;
    }

    setIsCheckingMidtransStatus(true);
    setStatusMessage(null);

    try {
      const checkRes = await api.checkMidtransStatus(activePendingOrder.orderNumber);
      if (checkRes.isPaid) {
        setIsStatusSuccess(true);
        setStatusMessage('🎉 Pembayaran TERDETEKSI LUNAS! E-Ticket resmi telah aktif.');
        setTimeout(() => {
          onOrderCompleted(checkRes.order || { ...activePendingOrder, paymentStatus: 'paid' });
        }, 1200);
      } else {
        setIsStatusSuccess(false);
        setStatusMessage(checkRes.message || 'Pembayaran belum diselesaikan. Status: Menunggu Pembayaran.');
      }
    } catch (err: any) {
      setStatusMessage('Gagal memeriksa status: ' + err.message);
    } finally {
      setIsCheckingMidtransStatus(false);
    }
  };

  // 3. Sandbox Simulator Confirm (Developer Sandbox Testing Only)
  const handleSandboxSimulatePaid = async () => {
    if (!activePendingOrder) return;
    setIsCheckingMidtransStatus(true);
    try {
      const res = await api.payOrder(activePendingOrder.id, `SIMULATED-PAY-${Date.now()}`);
      setIsStatusSuccess(true);
      setStatusMessage('🎉 (Uji Coba Sandbox) Pembayaran berhasil disimulasikan LUNAS!');
      setTimeout(() => {
        onOrderCompleted(res.order || { ...activePendingOrder, paymentStatus: 'paid' });
      }, 1000);
    } catch (err: any) {
      setStatusMessage('Gagal simulasi: ' + err.message);
    } finally {
      setIsCheckingMidtransStatus(false);
    }
  };

  // 4. Handle Manual Bank Transfer Checkout (Requires Super Admin Approval)
  const handleManualCheckout = async () => {
    if (isSessionExpired) {
      alert('Sesi pembayaran telah kedaluwarsa (15 menit). Harap ulangi pemesanan tiket.');
      return;
    }

    if (!senderAccountName.trim()) {
      setManualFormError('Nama pemilik rekening pengirim wajib diisi.');
      return;
    }
    if (!transferProofUrl) {
      setManualFormError('Harap unggah bukti struk transfer atau klik "Gunakan Contoh Struk" untuk simulasi.');
      return;
    }

    setIsProcessingPayment(true);
    setManualFormError(null);

    try {
      const orderNumber = `TN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const createdTickets = buildTicketObjects(orderNumber);

      const orderPayload: Partial<Order> = {
        orderNumber,
        userId: currentUser.id,
        eventId: event.id,
        eventTitle: event.title,
        creatorId: event.creatorId,
        creatorName: event.creatorName,
        buyerName,
        buyerEmail,
        buyerPhone,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        platformFee: totals.platformFee,
        totalAmount: totals.totalAmount,
        paymentType: 'manual',
        paymentMethod: 'bank_transfer_manual',
        paymentChannel: `Transfer Manual ${selectedBankAccount.bankName} (${selectedBankAccount.bankCode})`,
        paymentStatus: 'pending_manual_verification', // Strictly waiting for admin approval!
        paymentReference: `TRF-MANUAL-${Date.now()}`,
        paymentProofUrl: transferProofUrl,
        senderBank,
        senderAccountName,
        transferNotes,
        tickets: createdTickets,
        paidAt: undefined, // NOT PAID YET!
      };

      const finalOrder = await api.createOrder(orderPayload);
      setIsProcessingPayment(false);
      onOrderCompleted(finalOrder);
    } catch (err: any) {
      setIsProcessingPayment(false);
      alert('Gagal menyelesaikan proses order manual: ' + err.message);
    }
  };

  const handleCopyTargetAccount = () => {
    navigator.clipboard.writeText(selectedBankAccount.accountNumber.replace(/-/g, ''));
    setCopiedAccountNo(true);
    setTimeout(() => setCopiedAccountNo(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[94vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
              Langkah {step} dari 2 • {step === 1 ? 'Data Pendaftar' : 'Pilihan Pembayaran'}
            </span>
            <h3 className="text-base font-bold text-white">
              {step === 1 ? 'Formulir Registrasi & Kuesioner' : 'Metode Pembayaran (Otomatis Midtrans / Manual Transfer)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Order Summary Strip */}
          <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/80 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-extrabold text-blue-950 block truncate max-w-sm">
                {event.title}
              </span>
              <span className="text-slate-600">
                {flattenedTickets.length} Tiket • {flattenedTickets.map(t => t.tier.name).join(', ')}
              </span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-slate-500 block text-[10px]">Total Tagihan</span>
              <span className="font-extrabold text-blue-700 text-sm">
                {formatRupiah(totals.totalAmount)}
              </span>
            </div>
          </div>

          {step === 1 ? (
            /* STEP 1: FORMULIR PENDAFTARAN & CUSTOM FIELDS */
            <form id="checkout-form" onSubmit={handleProceedToPayment} className="space-y-5">
              {/* Data Kontak Pemesan */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
                  <UserIcon className="w-4 h-4 text-blue-600" />
                  1. Informasi Kontak Peserta
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Nama Lengkap Sesuai KTP"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Alamat Email (Pengiriman E-Ticket) *
                    </label>
                    <input
                      type="email"
                      required
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      No. WhatsApp Aktif *
                    </label>
                    <input
                      type="tel"
                      required
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Custom Fields Configured by Creator */}
              {event.customFields.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    2. Kuesioner & Formulir Tambahan (Dibuat Penyelenggara)
                  </h4>

                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    {event.customFields.map((field) => {
                      const hasError = formErrors[field.id];
                      return (
                        <div key={field.id} className="space-y-1">
                          <label className="block text-xs font-semibold text-slate-800">
                            {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                          </label>

                          {field.fieldType === 'dropdown' && field.options ? (
                            <select
                              value={customResponses[field.id] || ''}
                              onChange={(e) =>
                                setCustomResponses({ ...customResponses, [field.id]: e.target.value })
                              }
                              className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-hidden focus:ring-2 ${
                                hasError ? 'border-red-500 ring-red-200' : 'border-slate-300 focus:ring-blue-500'
                              }`}
                            >
                              <option value="">-- {field.placeholder || 'Pilih Salah Satu'} --</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.fieldType === 'textarea' ? (
                            <textarea
                              rows={2}
                              value={customResponses[field.id] || ''}
                              onChange={(e) =>
                                setCustomResponses({ ...customResponses, [field.id]: e.target.value })
                              }
                              placeholder={field.placeholder || ''}
                              className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-hidden focus:ring-2 ${
                                hasError ? 'border-red-500 ring-red-200' : 'border-slate-300 focus:ring-blue-500'
                              }`}
                            />
                          ) : (
                            <input
                              type={field.fieldType === 'number' ? 'number' : 'text'}
                              value={customResponses[field.id] || ''}
                              onChange={(e) =>
                                setCustomResponses({ ...customResponses, [field.id]: e.target.value })
                              }
                              placeholder={field.placeholder || ''}
                              className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-hidden focus:ring-2 ${
                                hasError ? 'border-red-500 ring-red-200' : 'border-slate-300 focus:ring-blue-500'
                              }`}
                            />
                          )}

                          {hasError && (
                            <p className="text-[11px] text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {hasError}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Voucher Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  Kupon Promo / Diskon (Opsional)
                </label>

                {!appliedVoucher ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voucherCodeInput}
                      onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                      placeholder="Masukkan kode voucher (Contoh: CELEBESKEREN)"
                      className="flex-1 px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyVoucher}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Terapkan
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-900">
                        Kupon Aktif: {appliedVoucher.code} ({appliedVoucher.discountType === 'percentage' ? `${appliedVoucher.discountValue}%` : formatRupiah(appliedVoucher.discountValue)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="text-xs text-red-600 hover:underline font-bold cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                )}

                {voucherError && <p className="text-xs text-red-600">{voucherError}</p>}
                {voucherSuccess && <p className="text-xs text-emerald-600">{voucherSuccess}</p>}
              </div>

              {/* Price Calculation Card per Blueprint v3 */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Harga Tiket Asli ({flattenedTickets.length} Tiket):</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(totals.subtotal)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Diskon Promo Kupon:</span>
                    <span>-{formatRupiah(totals.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 items-center">
                  <div className="flex items-center gap-1.5">
                    <span>Biaya Admin Platform:</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded-full">Flat Rp 2.000</span>
                  </div>
                  <span className="font-semibold text-slate-900">{formatRupiah(totals.platformFee)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                  <span>Total Tagihan Pembeli:</span>
                  <span className="text-blue-700">{formatRupiah(totals.totalAmount)}</span>
                </div>
              </div>
            </form>
          ) : (
            /* STEP 2: METODE PEMBAYARAN (OTOMATIS MIDTRANS VS MANUAL ADMIN) */
            <div className="space-y-5">
              
              {/* 15-MINUTE COUNTDOWN TIMER BANNER (BLUEPRINT V3: CUSTOM_EXPIRY) */}
              {!isSessionExpired ? (
                <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                    <div>
                      <span className="font-bold text-amber-950 block">Batas Waktu Pembayaran (15 Menit)</span>
                      <span className="text-[10px] text-amber-700">Tiket tertahan akan dibebaskan kembali jika waktu habis</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 block">Sisa Waktu:</span>
                    <span className="font-mono font-extrabold text-sm text-red-600 bg-white px-2 py-0.5 rounded-lg border border-amber-200 shadow-xs">
                      {formatTimer(secondsRemaining)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-red-800">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span>Sesi Pembayaran Telah Kedaluwarsa (15 Menit)</span>
                  </div>
                  <p className="text-[11px] text-red-700">
                    Sesuai arsitektur sistem, slot tiket telah dibebaskan kembali ke kuota sistem. Silakan ulangi langkah pemesanan untuk memilih tiket baru.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setIsSessionExpired(false);
                      setSecondsRemaining(15 * 60);
                      setActivePendingOrder(null);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    Ulangi Pemesanan Tiket
                  </button>
                </div>
              )}

              {/* MAIN PAYMENT MODE SELECTOR (OTOMATIS VS MANUAL) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Pilih Jalur & Sistem Pembayaran:
                </label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPaymentType('automatic')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentType === 'automatic'
                        ? 'bg-white text-blue-700 shadow-sm border border-blue-200 ring-2 ring-blue-500/10'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-blue-600" />
                      <span>Pembayaran Otomatis</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Midtrans Snap / QRIS / VA
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('manual')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentType === 'manual'
                        ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200 ring-2 ring-emerald-500/10'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Pembayaran Manual</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Transfer & Verifikasi Admin Pusat
                    </span>
                  </button>
                </div>
              </div>

              {/* STATUS NOTIFICATION BANNER */}
              {statusMessage && (
                <div className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between border ${
                  isStatusSuccess 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-center gap-2">
                    {isStatusSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />}
                    <span>{statusMessage}</span>
                  </div>
                </div>
              )}

              {/* OPTION A: PEMBAYARAN OTOMATIS (MIDTRANS / QRIS) */}
              {paymentType === 'automatic' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* QRIS */}
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('qris');
                        setPaymentChannel('QRIS Dinamis');
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        paymentMethod === 'qris'
                          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">QRIS Dinamis</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Semua e-Wallet & M-Banking
                        </p>
                      </div>
                    </button>

                    {/* Virtual Account */}
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('virtual_account');
                        setPaymentChannel('Virtual Account');
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        paymentMethod === 'virtual_account'
                          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-purple-600 text-white shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Virtual Account</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          BCA, Mandiri, BRI, BNI
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Payment Action Box */}
                  <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                          Metode Pembayaran Otomatis:
                        </span>
                        <h5 className="font-bold text-sm text-white">{paymentChannel}</h5>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Total Tagihan:</span>
                        <span className="text-sm font-mono font-bold text-emerald-400">
                          {formatRupiah(totals.totalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Step indicator: Create Session -> Pay -> Verify */}
                    {!activePendingOrder ? (
                      <div className="text-center py-4 space-y-3">
                        <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                          Klik tombol di bawah untuk membuat sesi tagihan dan membuka jalur pembayaran Midtrans / QRIS.
                        </p>
                        <button
                          type="button"
                          disabled={isCreatingMidtrans}
                          onClick={handleStartAutomaticPayment}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/20 inline-flex items-center gap-2 cursor-pointer transition-all"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>{isCreatingMidtrans ? 'Menyiapkan Sesi...' : 'Lanjutkan ke Pembayaran Otomatis'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Nomor Order Terdaftar:</span>
                            <span className="font-mono font-bold text-blue-400">{activePendingOrder.orderNumber}</span>
                          </div>
                          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-bold text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>Menunggu Pembayaran</span>
                          </span>
                        </div>

                        {/* Midtrans Snap Button if live URL available */}
                        {midtransRedirectUrl && (
                          <div className="p-4 bg-blue-950/60 rounded-2xl border border-blue-500/30 text-center space-y-2">
                            <span className="text-xs text-blue-200 block font-medium">Gateway Midtrans Snap Resmi Siap:</span>
                            <a
                              href={midtransRedirectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Buka Jendela Pembayaran Midtrans Snap</span>
                            </a>
                            <p className="text-[10px] text-slate-400">
                              Setelah menyelesaikan pembayaran di Midtrans, kembali ke halaman ini dan tekan tombol "Cek Status Pembayaran".
                            </p>
                          </div>
                        )}

                        {paymentMethod === 'qris' && (
                          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800/80 p-4 rounded-2xl">
                            {simulatedQrisUrl && (
                              <div className="bg-white p-2 rounded-2xl shrink-0 shadow-lg">
                                <img src={simulatedQrisUrl} alt="QRIS Code" className="w-32 h-32" />
                              </div>
                            )}
                            <div className="text-xs space-y-1.5 text-slate-300">
                              <p className="font-semibold text-white">Cara Pembayaran QRIS:</p>
                              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                                <li>Buka GoPay, OVO, ShopeePay, Dana, atau BCA/Mandiri Mobile.</li>
                                <li>Pilih menu <strong>Scan / Bayar QR</strong>.</li>
                                <li>Scan QR di samping, periksa nominal {formatRupiah(totals.totalAmount)}, lalu konfirmasi.</li>
                                <li>Setelah transfer berhasil, klik tombol <strong>"Cek Status Pembayaran (Midtrans)"</strong> di bawah.</li>
                              </ol>
                            </div>
                          </div>
                        )}

                        {paymentMethod === 'virtual_account' && (
                          <div className="space-y-3 bg-slate-800/80 p-4 rounded-2xl">
                            <span className="text-xs text-slate-400 block">Nomor Virtual Account Otomatis:</span>
                            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-700">
                              <span className="text-base font-mono font-extrabold tracking-wider text-emerald-400">
                                {simulatedVaNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(simulatedVaNumber);
                                  setCopiedVa(true);
                                  setTimeout(() => setCopiedVa(false), 2000);
                                }}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                {copiedVa ? 'Tersalin' : 'Salin Nomor'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Live Check Button & Developer Simulator */}
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            disabled={isCheckingMidtransStatus}
                            onClick={handleCheckPaymentStatus}
                            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <RefreshCw className={`w-4 h-4 ${isCheckingMidtransStatus ? 'animate-spin' : ''}`} />
                            <span>{isCheckingMidtransStatus ? 'Memeriksa ke Midtrans...' : 'Cek Status Pembayaran (Midtrans)'}</span>
                          </button>

                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[10px] text-slate-400 italic">
                              Tiket & QR Code hanya akan terbit setelah pembayaran terdeteksi Lunas.
                            </span>
                            <button
                              type="button"
                              onClick={handleSandboxSimulatePaid}
                              className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                              title="Khusus pengujian developer tanpa kartu kredit sungguhan"
                            >
                              🧪 Simulasi Lunas (Sandbox Test)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OPTION B: PEMBAYARAN MANUAL (TRANSFER BANK & UPLOAD BUKTI) */}
              {paymentType === 'manual' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Select Destination Bank from Master Data */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        1. Pilih Rekening Bank Tujuan Transfer (Master Data Resmi):
                      </label>
                      <span className="text-[10px] text-slate-500">
                        {activeBankAccounts.length} Rekening Aktif
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {activeBankAccounts.map((bank) => {
                        const isSelected = selectedBankId === bank.id;
                        return (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => setSelectedBankId(bank.id)}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold ring-2 ring-blue-500/20'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block text-xs font-extrabold truncate">{bank.bankName}</span>
                            <span className="text-[10px] text-slate-500 block font-mono truncate">{bank.accountNumber}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Destination Account Display Card */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Silakan Transfer Tepat Senilai:</span>
                      <span className="text-sm font-extrabold text-emerald-400">
                        {formatRupiah(totals.totalAmount)}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">{selectedBankAccount.bankName} ({selectedBankAccount.bankCode})</span>
                        <span className="font-mono text-base font-extrabold text-white">
                          {selectedBankAccount.accountNumber}
                        </span>
                        <span className="text-[11px] text-slate-300 block">
                          a.n {selectedBankAccount.accountName}
                        </span>
                        {selectedBankAccount.notes && (
                          <span className="text-[10px] text-amber-300 block mt-0.5">
                            * {selectedBankAccount.notes}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyTargetAccount}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedAccountNo ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAccountNo ? 'Tersalin' : 'Salin Rekening'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Sender Details & Proof Upload Form */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                    <h5 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      2. Konfirmasi & Upload Bukti Transfer Manual
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          Bank Pengirim *
                        </label>
                        <input
                          type="text"
                          required
                          value={senderBank}
                          onChange={(e) => setSenderBank(e.target.value)}
                          placeholder="Misal: Bank BCA / Mandiri / Jago"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          Nama Pemilik Rekening Pengirim *
                        </label>
                        <input
                          type="text"
                          required
                          value={senderAccountName}
                          onChange={(e) => setSenderAccountName(e.target.value)}
                          placeholder="Nama Sesuai Buku Tabungan / Mutasi"
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Proof of Transfer Upload Box */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-medium text-slate-700">
                          File Bukti Struk Transfer (JPG / PNG) *
                        </label>
                        <button
                          type="button"
                          onClick={handleUseSampleProof}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          + Gunakan Contoh Struk (Simulasi Cepat)
                        </button>
                      </div>

                      {transferProofUrl ? (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={transferProofUrl}
                              alt="Bukti Transfer"
                              className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block text-xs">Bukti Transfer Terlampir</span>
                              <span className="text-[10px] text-emerald-600 font-medium">✓ Siap diverifikasi oleh Admin Pusat</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTransferProofUrl('')}
                            className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-bold cursor-pointer"
                          >
                            Ganti File
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white p-4 rounded-xl text-center block cursor-pointer transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                          <span className="font-bold text-slate-700 block text-xs">Pilih Foto Bukti Transfer</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Klik di sini untuk upload atau klik "Gunakan Contoh Struk" di atas
                          </span>
                        </label>
                      )}
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Catatan Tambahan (Opsional)
                      </label>
                      <input
                        type="text"
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                        placeholder="Contoh: Transfer lewat M-Banking jam 11:30 WITA"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {manualFormError && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{manualFormError}</span>
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Verifikasi Manual Admin Pusat:</strong> Bukti transfer akan ditinjau langsung oleh Admin Pusat di Super Admin Dashboard. E-ticket resmi dan QR code check-in akan aktif setelah disetujui.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessingPayment}
                    onClick={handleManualCheckout}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isProcessingPayment ? (
                      <span>Mengirimkan Bukti ke Admin Pusat...</span>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>Kirim Bukti Pembayaran ke Admin Pusat</span>
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl cursor-pointer"
            >
              ← Ubah Data Pendaftar
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl cursor-pointer"
            >
              Batal
            </button>
          )}

          {step === 1 && (
            <button
              type="submit"
              form="checkout-form"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <span>Lanjut ke Pembayaran</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
