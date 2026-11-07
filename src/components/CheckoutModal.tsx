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
  DollarSign
} from 'lucide-react';
import QRCode from 'qrcode';
import { EventItem, Order, TicketTier, User, PaymentMethod, Ticket, Voucher } from '../types';
import { calculateOrderTotals, formatRupiah, generateTicketCode, generateQrPayload, validateCustomResponses } from '../utils/ticketing-logic';
import { api } from '../services/api';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  selectedTickets: { tier: TicketTier; quantity: number }[];
  currentUser: User;
  onOrderCompleted: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  event,
  selectedTickets,
  currentUser,
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

  // Manual Transfer Form State
  const [targetBank, setTargetBank] = useState<'bca' | 'mandiri' | 'bsi'>('bca');
  const [senderBank, setSenderBank] = useState('Bank BCA');
  const [senderAccountName, setSenderAccountName] = useState(currentUser.name || 'Budi Santoso');
  const [transferProofUrl, setTransferProofUrl] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState('');
  const [manualFormError, setManualFormError] = useState<string | null>(null);
  const [copiedAccountNo, setCopiedAccountNo] = useState(false);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Flattened tickets list for registration
  const flattenedTickets: { tier: TicketTier; index: number }[] = [];
  selectedTickets.forEach(item => {
    for (let i = 0; i < item.quantity; i++) {
      flattenedTickets.push({ tier: item.tier, index: flattenedTickets.length + 1 });
    }
  });

  // Calculate Totals
  const orderCalcItems = selectedTickets.map(item => ({
    price: item.tier.price,
    quantity: item.quantity,
  }));

  const totals = calculateOrderTotals(
    orderCalcItems,
    appliedVoucher
      ? { discountType: appliedVoucher.discountType, discountValue: appliedVoucher.discountValue }
      : null,
    { fixed: 4500, percentage: 0 }
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
    // Realistic Indonesian mobile banking receipt sample image
    const sampleReceipt = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80';
    setTransferProofUrl(sampleReceipt);
    setManualFormError(null);
  };

  // Final Order Submission (Automatic or Manual)
  const handleFinalCheckout = async () => {
    // If manual payment, require proof and sender info
    if (paymentType === 'manual') {
      if (!senderAccountName.trim()) {
        setManualFormError('Nama pemilik rekening pengirim wajib diisi.');
        return;
      }
      if (!transferProofUrl) {
        setManualFormError('Harap unggah bukti transfer gambar atau klik "Gunakan Contoh Struk" untuk simulasi.');
        return;
      }
    }

    setIsProcessingPayment(true);
    setManualFormError(null);

    try {
      const orderNumber = `TN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const isAutomatic = paymentType === 'automatic';
      const orderStatus = isAutomatic ? 'paid' : 'pending_manual_verification';

      const createdTickets: Ticket[] = flattenedTickets.map((t, idx) => {
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
          checkInStatus: 'not_checked_in',
          createdAt: new Date().toISOString(),
          responses,
        };
      });

      const orderPayload: Partial<Order> = {
        orderNumber,
        userId: currentUser.id,
        eventId: event.id,
        eventTitle: event.title,
        buyerName,
        buyerEmail,
        buyerPhone,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        platformFee: totals.platformFee,
        totalAmount: totals.totalAmount,
        paymentType,
        paymentMethod: isAutomatic ? paymentMethod : 'bank_transfer_manual',
        paymentChannel: isAutomatic
          ? paymentChannel
          : `Transfer Manual ${targetBank.toUpperCase()} (${targetBank === 'bca' ? 'BCA' : targetBank === 'mandiri' ? 'Mandiri' : 'BSI Syariah'})`,
        paymentStatus: orderStatus,
        paymentReference: isAutomatic
          ? (paymentMethod === 'qris' ? `QRIS-${Date.now()}` : `VA-${simulatedVaNumber}`)
          : `TRF-MANUAL-${Date.now()}`,
        paymentProofUrl: isAutomatic ? undefined : transferProofUrl,
        senderBank: isAutomatic ? undefined : senderBank,
        senderAccountName: isAutomatic ? undefined : senderAccountName,
        transferNotes: isAutomatic ? undefined : transferNotes,
        tickets: createdTickets,
        paidAt: isAutomatic ? new Date().toISOString() : undefined,
      };

      const finalOrder = await api.createOrder(orderPayload);
      setIsProcessingPayment(false);
      onOrderCompleted(finalOrder);
    } catch (err: any) {
      setIsProcessingPayment(false);
      alert('Gagal menyelesaikan proses order: ' + err.message);
    }
  };

  const bankDestinations = {
    bca: { name: 'Bank BCA', accountNo: '888-019-2831', accountName: 'PT TIKET NUSA DIGITAL' },
    mandiri: { name: 'Bank Mandiri', accountNo: '137-00-19283-912', accountName: 'TIKET NUSA INDONESIA' },
    bsi: { name: 'Bank BSI (Syariah)', accountNo: '719-283-0012', accountName: 'TIKET NUSA SYARIAH' },
  };

  const handleCopyTargetAccount = () => {
    navigator.clipboard.writeText(bankDestinations[targetBank].accountNo.replace(/-/g, ''));
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
              {step === 1 ? 'Formulir Registrasi & Kuesioner' : 'Metode Pembayaran (Otomatis / Manual)'}
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

              {/* Price Calculation Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({flattenedTickets.length} Tiket):</span>
                  <span>{formatRupiah(totals.subtotal)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Diskon Promo:</span>
                    <span>-{formatRupiah(totals.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Layanan & Pembayaran:</span>
                  <span>{formatRupiah(totals.platformFee)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                  <span>Total Pembayaran:</span>
                  <span className="text-blue-700">{formatRupiah(totals.totalAmount)}</span>
                </div>
              </div>
            </form>
          ) : (
            /* STEP 2: METODE PEMBAYARAN (OTOMATIS VS MANUAL) */
            <div className="space-y-5">
              
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
                      QRIS / VA • Terverifikasi Instan
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
                      Transfer Bank & Upload Bukti
                    </span>
                  </button>
                </div>
              </div>

              {/* OPTION A: PEMBAYARAN OTOMATIS */}
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
                        setPaymentChannel('BCA Virtual Account');
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

                  {/* Automatic Details Box */}
                  <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                          Instruksi Otomatis:
                        </span>
                        <h5 className="font-bold text-sm text-white">{paymentChannel}</h5>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatRupiah(totals.totalAmount)}
                      </span>
                    </div>

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
                            <li>Buka aplikasi GoPay, OVO, ShopeePay, Dana, atau BCA/Mandiri Mobile.</li>
                            <li>Pilih menu <strong>Scan / Bayar QR</strong>.</li>
                            <li>Arahkan kamera ke QR di samping dan konfirmasi PIN Anda.</li>
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

                    <button
                      type="button"
                      disabled={isProcessingPayment}
                      onClick={handleFinalCheckout}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {isProcessingPayment ? (
                        <span>Menerbitkan E-Ticket Resmi...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Bayar Sekarang (Verifikasi Otomatis & Terbitkan E-Ticket)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* OPTION B: PEMBAYARAN MANUAL (TRANSFER BANK & UPLOAD BUKTI) */}
              {paymentType === 'manual' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Select Destination Bank */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      1. Pilih Rekening Bank Tujuan Transfer:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetBank('bca')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          targetBank === 'bca'
                            ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold ring-2 ring-blue-500/20'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-xs font-extrabold">Bank BCA</span>
                        <span className="text-[10px] text-slate-500">888-019-2831</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTargetBank('mandiri')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          targetBank === 'mandiri'
                            ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold ring-2 ring-blue-500/20'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-xs font-extrabold">Bank Mandiri</span>
                        <span className="text-[10px] text-slate-500">137-00-1928</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTargetBank('bsi')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          targetBank === 'bsi'
                            ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold ring-2 ring-blue-500/20'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-xs font-extrabold">Bank BSI</span>
                        <span className="text-[10px] text-slate-500">719-283-0012</span>
                      </button>
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
                        <span className="text-[10px] text-slate-400 uppercase block">{bankDestinations[targetBank].name}</span>
                        <span className="font-mono text-base font-extrabold text-white">
                          {bankDestinations[targetBank].accountNo}
                        </span>
                        <span className="text-[11px] text-slate-300 block">
                          a.n {bankDestinations[targetBank].accountName}
                        </span>
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
                              <span className="text-[10px] text-emerald-600 font-medium">✓ Siap diverifikasi oleh admin</span>
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
                        placeholder="Contoh: Transfer lewat M-Banking jam 11:30 WIB"
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
                      <strong>Pengecekan Manual:</strong> Tim admin/kreator akan memeriksa mutasi bank Anda dalam 1x24 jam. E-ticket resmi akan otomatis aktif setelah pembayaran disetujui.
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessingPayment}
                    onClick={handleFinalCheckout}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isProcessingPayment ? (
                      <span>Mengirim Bukti Transfer...</span>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>Kirim Bukti Pembayaran & Daftarkan Tiket</span>
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
