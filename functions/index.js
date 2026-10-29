/**
 * functions/index.js
 * ImageVault Backend – Email OTP Generation, Verification & Firebase Custom Auth Token Minting
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cors = require('cors')({ origin: true });

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

// Secret salt for HMAC hashing of OTPs (configured via environment or fallback)
const HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'imagevault-otp-secret-key-salt-987123';

// ─── Email Transporter Setup ──────────────────────────────────────────────────
// Configure via Firebase Functions environment variables:
// firebase functions:config:set smtp.host="smtp.gmail.com" smtp.port="465" smtp.user="you@gmail.com" smtp.pass="app-password"
function getEmailTransporter() {
  const config = functions.config().smtp || {};
  const host = process.env.SMTP_HOST || config.host;
  const port = parseInt(process.env.SMTP_PORT || config.port || '465', 10);
  const user = process.env.SMTP_USER || config.user;
  const pass = process.env.SMTP_PASS || config.pass;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
}

function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

function hashOtp(otp) {
  return crypto.createHmac('sha256', HMAC_SECRET).update(String(otp).trim()).digest('hex');
}

// ─── 1. Send OTP Function ────────────────────────────────────────────────────
exports.sendOtp = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'A valid email address is required.' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: 'Invalid email address format.' });
      }

      const emailHash = hashEmail(cleanEmail);
      const otpDocRef = db.collection('otp_requests').doc(emailHash);
      const existingDoc = await otpDocRef.get();

      const now = Date.now();

      // Rate limit: 60 seconds minimum between OTP requests
      if (existingDoc.exists) {
        const data = existingDoc.data();
        if (data.lastSentAt && now - data.lastSentAt < 60 * 1000) {
          const waitSeconds = Math.ceil((60 * 1000 - (now - data.lastSentAt)) / 1000);
          return res.status(429).json({
            error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
          });
        }
      }

      // Generate cryptographically secure 6-digit OTP
      const otp = crypto.randomInt(100000, 1000000).toString();
      const otpHash = hashOtp(otp);

      // 5-minute expiry
      const expiresAt = now + 5 * 60 * 1000;

      await otpDocRef.set({
        emailHash,
        otpHash,
        expiresAt,
        attempts: 0,
        lastSentAt: now,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const transporter = getEmailTransporter();

      if (transporter) {
        const mailOptions = {
          from: `"ImageVault Security" <${process.env.SMTP_FROM || 'noreply@imagevault.app'}>`,
          to: cleanEmail,
          subject: `Your ImageVault Verification Code: ${otp}`,
          text: `Your one-time login verification code is ${otp}. This code expires in 5 minutes.\n\nIf you did not request this code, please ignore this email.`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <h2 style="color: #4f46e5; margin-bottom: 8px;">🔐 ImageVault Verification</h2>
              <p style="color: #475569; font-size: 15px; margin-bottom: 24px;">Use the verification code below to complete your login or registration. It is valid for <strong>5 minutes</strong>.</p>
              <div style="background: #f8fafc; border: 2px dashed #6366f1; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e1b4b; font-family: monospace;">${otp}</span>
              </div>
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">If you did not request this verification code, you can safely disregard this email. Never share this code with anyone.</p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({
          success: true,
          message: 'Verification code sent to your email.',
        });
      } else {
        // SMTP not configured – provide clear guidance and log code to functions log
        console.warn(`[ImageVault OTP Dev/Demo] SMTP credentials not set. OTP for ${cleanEmail}: ${otp}`);
        return res.status(200).json({
          success: true,
          smtpConfigured: false,
          debugCode: otp, // Returned for dev testing only when SMTP is unconfigured
          message: 'Code generated. (SMTP not configured on backend; dev test code logged).',
        });
      }
    } catch (err) {
      console.error('sendOtp error:', err);
      return res.status(500).json({ error: 'Failed to send verification code. ' + err.message });
    }
  });
});

// ─── 2. Verify OTP Function ──────────────────────────────────────────────────
exports.verifyOtp = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ error: 'Email and verification code are required.' });
      }

      const cleanEmail = email.toLowerCase().trim();
      const cleanOtp = String(otp).trim();
      const emailHash = hashEmail(cleanEmail);
      const otpDocRef = db.collection('otp_requests').doc(emailHash);
      const snapshot = await otpDocRef.get();

      if (!snapshot.exists) {
        return res.status(400).json({
          error: 'No active code found. Please request a new verification code.',
        });
      }

      const record = snapshot.data();
      const now = Date.now();

      // Check expiry (5 minutes)
      if (now > record.expiresAt) {
        await otpDocRef.delete();
        return res.status(400).json({
          error: 'Verification code has expired. Please request a new one.',
        });
      }

      // Check max attempt limit (5 attempts max)
      if (record.attempts >= 5) {
        await otpDocRef.delete();
        return res.status(429).json({
          error: 'Too many incorrect attempts. Please request a new verification code.',
        });
      }

      // Verify OTP hash with timingSafeEqual to prevent timing attacks
      const incomingHash = hashOtp(cleanOtp);
      const match = crypto.timingSafeEqual(
        Buffer.from(incomingHash, 'hex'),
        Buffer.from(record.otpHash, 'hex')
      );

      if (!match) {
        // Increment failed attempt counter
        await otpDocRef.update({ attempts: record.attempts + 1 });
        const remaining = 5 - (record.attempts + 1);
        return res.status(400).json({
          error: `Incorrect verification code. ${remaining} attempt(s) remaining.`,
        });
      }

      // Invalidate code immediately upon successful verification
      await otpDocRef.delete();

      // ─── Get or create Firebase Auth user ────────────────────────
      let userRecord;
      let isNewUser = false;
      try {
        userRecord = await auth.getUserByEmail(cleanEmail);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            email: cleanEmail,
            emailVerified: true,
          });
          isNewUser = true;
        } else {
          throw err;
        }
      }

      // Ensure emailVerified is marked true
      if (!userRecord.emailVerified) {
        await auth.updateUser(userRecord.uid, { emailVerified: true });
      }

      // ─── Initialize or update Firestore profile ───────────────────
      const userDocRef = db.collection('users').doc(userRecord.uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        await userDocRef.set({
          uid: userRecord.uid,
          email: cleanEmail,
          displayName: userRecord.displayName || cleanEmail.split('@')[0],
          photoURL: userRecord.photoURL || null,
          emailVerified: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await userDocRef.update({
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // ─── Mint Custom Auth Token for Persistent Client Login ───────
      const customToken = await auth.createCustomToken(userRecord.uid);

      return res.status(200).json({
        success: true,
        customToken,
        uid: userRecord.uid,
        email: cleanEmail,
        isNewUser,
      });
    } catch (err) {
      console.error('verifyOtp error:', err);
      return res.status(500).json({ error: 'Verification failed. ' + err.message });
    }
  });
});
