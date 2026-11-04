import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { auth } from '../services/firebase.js';
import { useToast } from '../components/Toast.jsx';

function mapFirebaseError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later or reset your password.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    default:
      return 'Sign in failed. Please check your credentials and try again.';
  }
}

export default function Login() {
  const { currentUser, isConfigured, sendOtp, verifyOtp, authError, signInWithEmail, sendPasswordReset, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // ─── Tab state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('password'); // 'password' | 'otp'

  // ─── Email+Password tab ───────────────────────────────────────────────────────
  const [pwEmail, setPwEmail] = useState('');
  const [pwPassword, setPwPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState(null);

  // Unverified email state
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  // Forgot password inline flow
  const [forgotStep, setForgotStep] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState(null);

  // ─── OTP tab ──────────────────────────────────────────────────────────────────
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

  // ─── Password Sign In ─────────────────────────────────────────────────────────
  const handlePasswordSignIn = async (e) => {
    e.preventDefault();
    setPwError(null);
    setUnverifiedUser(null);

    if (!pwEmail.trim() || !pwPassword) {
      setPwError('Please enter your email and password.');
      return;
    }

    setPwLoading(true);
    try {
      const user = await signInWithEmail(pwEmail.trim().toLowerCase(), pwPassword, rememberMe);
      if (user && !user.emailVerified) {
        setUnverifiedUser(user);
        setPwError(null);
        return;
      }
      toast.show('Signed in successfully!', 'success');
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      const code = err?.code || '';
      setPwError(mapFirebaseError(code));
    } finally {
      setPwLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      await resendVerificationEmail();
      toast.show('Verification email sent! Check your inbox.', 'success');
    } catch (err) {
      toast.show(err.message || 'Failed to resend verification email.', 'error');
    } finally {
      setResendingVerification(false);
    }
  };

  // ─── Forgot Password ──────────────────────────────────────────────────────────
  const openForgotPassword = () => {
    setResetEmail(pwEmail);
    setResetError(null);
    setResetSent(false);
    setForgotStep(true);
  };

  const handleSendReset = async (e) => {
    e.preventDefault();
    setResetError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordReset(resetEmail.trim().toLowerCase());
      setResetSent(true);
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        setResetError('No account found with this email address.');
      } else {
        setResetError('Failed to send reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  // ─── OTP handlers ─────────────────────────────────────────────────────────────
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
    const cleaned = value.replace(/\D/g, '');
    const newOtp = [...otp];

    if (cleaned.length > 1) {
      const pastedDigits = cleaned.slice(0, 6).split('');
      pastedDigits.forEach((d, i) => { newOtp[i] = d; });
      setOtp(newOtp);
      const nextIdx = Math.min(pastedDigits.length, 5);
      otpInputsRef.current[nextIdx]?.focus();
      return;
    }

    newOtp[index] = cleaned;
    setOtp(newOtp);
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

  // ─── Forgot Password Screen ───────────────────────────────────────────────────
  if (forgotStep) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo-box">
              <Lock className="login-logo-icon" size={28} />
            </div>
            <h1 className="login-title">Reset Password</h1>
            <p className="login-subtitle">
              Enter your email and we'll send you a password reset link.
            </p>
          </div>

          {resetSent ? (
            <>
              <div className="alert-banner success" style={{ marginBottom: 24 }}>
                <CheckCircle2 size={18} className="alert-icon" />
                <div>
                  <strong>Reset email sent!</strong> Check your inbox for the password reset link.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => { setForgotStep(false); setResetSent(false); }}
              >
                Back to Sign In
              </button>
            </>
          ) : (
            <form onSubmit={handleSendReset} className="login-form">
              {resetError && (
                <div className="alert-banner error" style={{ marginBottom: 16 }}>
                  <AlertCircle size={18} className="alert-icon" />
                  <div>{resetError}</div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="reset-email" className="form-label">Email Address</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="reset-email"
                    type="email"
                    className="form-input"
                    placeholder="name@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={resetLoading}
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={resetLoading || !resetEmail.trim()}
              >
                {resetLoading ? (
                  <>
                    <RefreshCw size={18} className="spinner" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Reset Email
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-block"
                style={{ marginTop: 8 }}
                onClick={() => setForgotStep(false)}
              >
                ← Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ─── Main Login Page ──────────────────────────────────────────────────────────
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

        {/* Configuration notice */}
        {!isConfigured && (
          <div className="alert-banner warning" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} className="alert-icon" />
            <div>
              <strong>Firebase Setup Needed:</strong> Client configuration keys are not yet set in{' '}
              <code>.env</code>. Add your Firebase keys to test live cloud synchronization.
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab${activeTab === 'password' ? ' active' : ''}`}
            onClick={() => { setActiveTab('password'); setPwError(null); setUnverifiedUser(null); }}
          >
            <Lock size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Email & Password
          </button>
          <button
            type="button"
            className={`auth-tab${activeTab === 'otp' ? ' active' : ''}`}
            onClick={() => { setActiveTab('otp'); setError(null); }}
          >
            <Smartphone size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Email Code (OTP)
          </button>
        </div>

        {/* ── Tab 1: Email & Password ─────────────────────────────────────────── */}
        {activeTab === 'password' && (
          <>
            {/* Unverified email banner */}
            {unverifiedUser && (
              <div className="alert-banner warning" style={{ marginBottom: 20 }}>
                <AlertCircle size={18} className="alert-icon" />
                <div>
                  <strong>Email not verified.</strong> Please check your inbox and click the verification link.
                  <button
                    type="button"
                    style={{ display: 'block', marginTop: 8, color: 'var(--accent)', fontWeight: 600, background: 'none', padding: 0, fontSize: '0.875rem' }}
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                  >
                    {resendingVerification ? 'Resending...' : 'Resend Verification Email'}
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {pwError && (
              <div className="alert-banner error" style={{ marginBottom: 20 }}>
                <AlertCircle size={18} className="alert-icon" />
                <div>{pwError}</div>
              </div>
            )}

            <form onSubmit={handlePasswordSignIn} className="login-form">
              <div className="form-group">
                <label htmlFor="pw-email" className="form-label">Email Address</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="pw-email"
                    type="email"
                    className="form-input"
                    placeholder="name@example.com"
                    value={pwEmail}
                    onChange={(e) => setPwEmail(e.target.value)}
                    disabled={pwLoading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="pw-password" className="form-label">Password</label>
                <div className="input-with-icon password-input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="pw-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Your password"
                    value={pwPassword}
                    onChange={(e) => setPwPassword(e.target.value)}
                    disabled={pwLoading}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="remember-row" style={{ marginBottom: 16 }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={pwLoading}
                  />
                  Remember Me
                </label>
                <button
                  type="button"
                  className="forgot-link"
                  onClick={openForgotPassword}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={pwLoading || !pwEmail.trim() || !pwPassword}
              >
                {pwLoading ? (
                  <>
                    <RefreshCw size={18} className="spinner" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="auth-redirect">
              Don't have an account?
              <Link to="/signup"> Create one</Link>
            </div>
          </>
        )}

        {/* ── Tab 2: OTP ──────────────────────────────────────────────────────── */}
        {activeTab === 'otp' && (
          <>
            {/* Error message */}
            {(error || authError) && (
              <div className="alert-banner error" style={{ marginBottom: 20 }}>
                <AlertCircle size={18} className="alert-icon" />
                <div>{error || authError}</div>
              </div>
            )}

            {/* Dev notice */}
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
                  <label htmlFor="otp-email" className="form-label">Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="otp-email"
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

                {/* Resend */}
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

            <div className="auth-redirect">
              Don't have an account?
              <Link to="/signup"> Create one</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
