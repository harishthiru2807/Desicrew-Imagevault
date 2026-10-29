/**
 * otpService.js
 * Client communication with Firebase Cloud Functions OTP backend.
 * Includes local dev fallback when Cloud Functions endpoint is not yet configured.
 */

const API_BASE = import.meta.env.VITE_OTP_API_URL || '';

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function requestEmailOtp(email) {
  const cleanEmail = email.toLowerCase().trim();

  // If backend endpoint is provided, call the Cloud Function
  if (API_BASE) {
    const endpoint = `${API_BASE.replace(/\/$/, '')}/sendOtp`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Failed to send code (Status: ${response.status})`);
    }
    return data;
  }

  // ─── Local Dev Mode (when Cloud Functions URL is not yet configured in .env) ──
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `imagevault_otp_${cleanEmail}`;

  // Rate limit: 60 seconds
  const existing = sessionStorage.getItem(key);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      const diff = Date.now() - parsed.timestamp;
      if (diff < 60 * 1000) {
        const remaining = Math.ceil((60 * 1000 - diff) / 1000);
        throw new Error(`Please wait ${remaining} seconds before requesting a new code.`);
      }
    } catch (e) {
      if (e.message.includes('Please wait')) throw e;
    }
  }

  sessionStorage.setItem(
    key,
    JSON.stringify({
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      timestamp: Date.now(),
    })
  );

  return {
    success: true,
    isDevMode: true,
    smtpConfigured: false,
    debugCode: otp,
    message: 'Code generated. (Cloud Functions endpoint not yet configured; dev test code generated).',
  };
}

export async function verifyEmailOtp(email, otp) {
  const cleanEmail = email.toLowerCase().trim();
  const cleanOtp = String(otp).trim();

  // If backend endpoint is provided, verify via Cloud Function
  if (API_BASE) {
    const endpoint = `${API_BASE.replace(/\/$/, '')}/verifyOtp`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Failed to verify code (Status: ${response.status})`);
    }
    return data;
  }

  // ─── Local Dev Mode Verification ──
  const key = `imagevault_otp_${cleanEmail}`;
  const stored = sessionStorage.getItem(key);

  if (!stored) {
    throw new Error('No active verification code found. Please request a new code.');
  }

  const record = JSON.parse(stored);
  if (Date.now() > record.expiresAt) {
    sessionStorage.removeItem(key);
    throw new Error('Verification code has expired. Please request a new one.');
  }

  if (record.attempts >= 5) {
    sessionStorage.removeItem(key);
    throw new Error('Too many incorrect attempts. Please request a new code.');
  }

  if (record.otp !== cleanOtp) {
    record.attempts += 1;
    sessionStorage.setItem(key, JSON.stringify(record));
    const remaining = 5 - record.attempts;
    throw new Error(`Incorrect verification code. ${remaining} attempt(s) remaining.`);
  }

  // Success – invalidate code immediately
  sessionStorage.removeItem(key);

  const uid = `usr_${simpleHash(cleanEmail)}_${Date.now().toString(36)}`;
  return {
    success: true,
    isDevMode: true,
    uid,
    email: cleanEmail,
  };
}
