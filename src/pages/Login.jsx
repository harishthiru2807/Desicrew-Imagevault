import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Smartphone,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Login() {
  const { currentUser, isConfigured, sendOtp, verifyOtp, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [devNotice, setDevNotice] = useState(null);

  const otpInputsRef = useRef([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, location]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setDevNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(cleanEmail);
      setStep('otp');
      setCountdown(60);

      if (res && res.debugCode) {
        setDevNotice({
          message: 'Real email delivery requires SMTP / Cloud Functions. For testing right now, your one-time code is displayed below.',
          debugCode: res.debugCode,
        });
        toast.show(`Verification code: ${res.debugCode}`, 'info');
      } else {
        toast.show('Verification code sent to your email!', 'success');
      }
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');
    const newOtp = [...otp];

    if (cleaned.length > 1) {
      // Handle paste
      const pastedDigits = cleaned.slice(0, 6).split('');
      pastedDigits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(pastedDigits.length, 5);
      otpInputsRef.current[nextIdx]?.focus();
      return;
    }

    newOtp[index] = cleaned;
    setOtp(newOtp);

    // Auto-advance
    if (cleaned && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    const fullCode = otp.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email.trim().toLowerCase(), fullCode);
      toast.show('Signed in successfully!', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-logo-box">
            <Lock className="login-logo-icon" size={28} />
          </div>
          <h1 className="login-title">ImageVault</h1>
          <p className="login-subtitle">
            Secure, encrypted image records synced across all your authorized devices.
          </p>
        </div>

        {/* Configuration notice if Firebase keys are missing */}
        {!isConfigured && (
          <div className="alert-banner warning" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} className="alert-icon" />
            <div>
              <strong>Firebase Setup Needed:</strong> Client configuration keys are not yet set in{' '}
              <code>.env</code>. Add your Firebase keys to test live cloud synchronization.
            </div>
          </div>
        )}

        {/* Error message */}
        {(error || authError) && (
          <div className="alert-banner error" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} className="alert-icon" />
            <div>{error || authError}</div>
          </div>
        )}

        {/* Dev SMTP notice if backend email delivery is unconfigured */}
        {devNotice && (
          <div className="alert-banner info" style={{ marginBottom: 20 }}>
            <Info size={18} className="alert-icon" />
            <div>
              <strong>Email Provider Notice:</strong> {devNotice.message}
              {devNotice.debugCode && (
                <div style={{ marginTop: 6 }}>
                  Test Code for development: <strong style={{ letterSpacing: 2 }}>{devNotice.debugCode}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Email Form */}
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email Address
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                />
              </div>
              <span className="form-hint">
                We'll email you a secure 6-digit one-time passcode. No password required.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="spinner" />
                  Sending Code...
                </>
              ) : (
                <>
                  Continue with Email
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 2 }}
              onClick={() => navigate('/')}
            >
              Skip & Continue as Guest (Local Mode)
            </button>

            <div className="login-features">
              <div className="feature-item">
                <ShieldCheck size={16} className="feature-icon" />
                <span>Persistent device session</span>
              </div>
              <div className="feature-item">
                <Smartphone size={16} className="feature-icon" />
                <span>Multi-device cloud sync</span>
              </div>
            </div>
          </form>
        ) : (
          /* Step 2: OTP Entry Form */
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="otp-header">
              <div className="otp-email-badge">
                <KeyRound size={16} />
                <span>Code sent to <strong>{email}</strong></span>
              </div>
              <button
                type="button"
                className="btn-text"
                onClick={() => {
                  setStep('email');
                  setOtp(['', '', '', '', '', '']);
                  setError(null);
                }}
              >
                Change Email
              </button>
            </div>

            {/* Dev Mode Code Banner */}
            {devNotice?.debugCode && (
              <div
                style={{
                  background: 'var(--accent-light)',
                  border: '1.5px dashed var(--accent)',
                  borderRadius: 'var(--radius)',
                  padding: '14px 16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  ⚡ <strong>Local Test Mode:</strong> Real email delivery requires SMTP. Your one-time verification code is:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '4px', color: 'var(--accent)', fontFamily: 'monospace' }}>
                    {devNotice.debugCode}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => {
                      const digits = devNotice.debugCode.split('');
                      setOtp(digits);
                    }}
                  >
                    Auto-Fill Code
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>
                Enter 6-Digit Verification Code
              </label>
              <div className="otp-inputs-grid">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputsRef.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="otp-digit-input"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    disabled={loading}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              <span className="form-hint" style={{ textAlign: 'center', display: 'block' }}>
                Code expires in 5 minutes.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading || otp.join('').length !== 6}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="spinner" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Sign In
                  <CheckCircle2 size={18} />
                </>
              )}
            </button>

            {/* Resend Action */}
            <div className="resend-box">
              {countdown > 0 ? (
                <span className="resend-countdown">
                  Resend code in <strong>{countdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  className="btn-link"
                  onClick={handleSendOtp}
                  disabled={loading}
                >
                  Didn't receive code? Resend
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
