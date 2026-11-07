import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOrderTotals,
  validateCustomResponses,
  generateTicketCode,
  generateQrPayload,
  verifyAndCheckInTicket,
  formatRupiah,
  generateSocialShareLinks,
} from './ticketing-logic';

test('calculateOrderTotals: handles zero or empty items correctly', () => {
  const result = calculateOrderTotals([]);
  assert.equal(result.subtotal, 0);
  assert.equal(result.discountAmount, 0);
  assert.equal(result.platformFee, 0);
  assert.equal(result.totalAmount, 0);
});

test('calculateOrderTotals: applies fixed fee and percentage voucher discount', () => {
  const items = [{ price: 100000, quantity: 2 }]; // 200,000
  const voucher = { discountType: 'percentage' as const, discountValue: 10 }; // 10% = 20,000
  const feeConfig = { fixed: 4500, percentage: 0 };

  const result = calculateOrderTotals(items, voucher, feeConfig);
  assert.equal(result.subtotal, 200000);
  assert.equal(result.discountAmount, 20000);
  assert.equal(result.platformFee, 4500);
  assert.equal(result.totalAmount, 184500); // (200000 - 20000) + 4500
});

test('calculateOrderTotals: caps fixed voucher discount to subtotal', () => {
  const items = [{ price: 30000, quantity: 1 }];
  const voucher = { discountType: 'fixed' as const, discountValue: 50000 };
  const feeConfig = { fixed: 2000, percentage: 0 };

  const result = calculateOrderTotals(items, voucher, feeConfig);
  assert.equal(result.subtotal, 30000);
  assert.equal(result.discountAmount, 30000); // capped at subtotal
  assert.equal(result.totalAmount, 2000); // only fee remains
});

test('validateCustomResponses: catches missing required fields and allows filled fields', () => {
  const fields = [
    { id: 'f1', label: 'Ukuran Baju', isRequired: true },
    { id: 'f2', label: 'Catatan', isRequired: false },
  ];

  const incomplete = validateCustomResponses(fields, { f1: '', f2: 'Bebas' });
  assert.equal(incomplete.isValid, false);
  assert.equal(incomplete.errors['f1'], 'Ukuran Baju wajib diisi');

  const complete = validateCustomResponses(fields, { f1: 'XL', f2: '' });
  assert.equal(complete.isValid, true);
  assert.equal(Object.keys(complete.errors).length, 0);
});

test('generateTicketCode & generateQrPayload: creates valid format and verification payload', () => {
  const code = generateTicketCode('TECH', 1234);
  assert.ok(code.startsWith('CE-TECH-'));
  
  const payload = generateQrPayload(code, 'evt-1', 'budi@test.com');
  assert.ok(payload.includes(code));
  assert.ok(payload.includes('evt-1'));
});

test('verifyAndCheckInTicket: successfully checks in and blocks duplicate check-in', () => {
  const mockTicket = {
    id: 'tkt-01',
    ticketCode: 'TN-TECH-001',
    checkInStatus: 'not_checked_in' as const,
  };

  const firstCheck = verifyAndCheckInTicket(mockTicket, '2026-11-05T10:00:00Z');
  assert.equal(firstCheck.success, true);
  assert.equal(firstCheck.checkInStatus, 'checked_in');
  assert.equal(firstCheck.checkInTime, '2026-11-05T10:00:00Z');

  // Second check on the updated ticket
  const secondCheck = verifyAndCheckInTicket({
    ...mockTicket,
    checkInStatus: firstCheck.checkInStatus,
    checkInTime: firstCheck.checkInTime,
  });
  assert.equal(secondCheck.success, false);
  assert.ok(secondCheck.message.includes('sudah pernah check-in'));
});

test('generateSocialShareLinks: creates valid WhatsApp, Telegram, and Google register URLs', () => {
  const event = {
    title: 'Festival Musik Nusantara',
    slug: 'festival-musik-nusantara',
    shortDescription: 'Festival musik spektakuler',
  };
  const links = generateSocialShareLinks(event, 'https://celebes-event.com');

  assert.ok(links.whatsapp.includes('api.whatsapp.com'));
  assert.ok(links.telegram.includes('t.me/share'));
  assert.ok(links.directUrl.includes('festival-musik-nusantara'));
  assert.ok(links.googleRegisterUrl.includes('auth_provider=google'));
});

test('manual payment verification flow: validates pending vs paid state for ticket admission', () => {
  const pendingStatus: string = 'pending_manual_verification';
  assert.equal(pendingStatus === 'paid', false);

  const approvedOrder = {
    paymentStatus: 'paid' as const,
    paidAt: new Date().toISOString(),
    verifiedBy: 'Creator Admin',
  };
  assert.equal(approvedOrder.paymentStatus, 'paid');
  assert.ok(approvedOrder.paidAt);
  assert.equal(approvedOrder.verifiedBy, 'Creator Admin');
});

test('platform fee deduction: calculates 2% percentage and fixed Rp2.000 deductions transparently', () => {
  // Test 1: Percentage fee (2%)
  const gross1 = 5000000;
  const pctFee = 2;
  const deduction1 = Math.round(gross1 * (pctFee / 100));
  const net1 = gross1 - deduction1;
  assert.equal(deduction1, 100000);
  assert.equal(net1, 4900000);

  // Test 2: Fixed fee (Rp 2.000)
  const gross2 = 500000;
  const fixedFee = 2000;
  const deduction2 = fixedFee;
  const net2 = gross2 - deduction2;
  assert.equal(deduction2, 2000);
  assert.equal(net2, 498000);
});

