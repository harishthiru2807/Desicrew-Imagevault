import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { auth } from '../services/firebase.js';
import { useToast } from '../components/Toast.jsx';

function validatePassword(pw) {
  const errors = [];
  if (pw.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(pw)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(pw)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(pw)) errors.push('One number');
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push('One special character');
  return errors;
}

function getPasswordStrength(pw) {
  if (!pw) return null;
  const checks = [
    pw.length >= 8,
    /[A-Z]/.test(pw),
    /[a-z]/.test(pw),
    /[0-9]/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
  ];
  const score = checks.filter(Boolean).length;
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

function mapFirebaseError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'Sign up failed. Please try again.';
  }
}

export default function SignUp() {
  const { signUpWithEmail, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [checkingVerified, setCheckingVerified] = useState(false);

  const strength = getPasswordStrength(password);

  const validate = () => {
    const errs = {};

    if (!fullName.trim()) errs.fullName = 'Full name is required.';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!emailRegex.test(email.trim())) errs.email = 'Please enter a valid email address.';

    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) errs.password = `Password needs: ${pwErrors.join(', ')}.`;

    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';

    if (!agreeTerms) errs.agreeTerms = 'You must agree to the terms to continue.';

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await signUpWithEmail(email.trim().toLowerCase(), password, fullName.trim());
      setStep('verify');
    } catch (err) {
      const code = err?.code || '';
      setSubmitError(mapFirebaseError(code));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await resendVerificationEmail();
      toast.show('Verification email resent! Check your inbox.', 'success');
    } catch (err) {
      toast.show(err.message || 'Failed to resend verification email.', 'error');
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    setCheckingVerified(true);
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        toast.show('Email verified! Welcome to ImageVault.', 'success');
        navigate('/', { replace: true });
      } else {
        toast.show('Email not verified yet. Please check your inbox and click the link.', 'warning');
      }
    } catch (err) {
      toast.show(err.message || 'Could not check verification status.', 'error');
    } finally {
      setCheckingVerified(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo-box">
              <CheckCircle2 className="login-logo-icon" size={28} />
            </div>
            <h1 className="login-title">Verify Your Email</h1>
            <p className="login-subtitle">
              We sent a verification link to <strong>{email}</strong>. Click it to activate your account.
            </p>
          </div>

          <div className="alert-banner info" style={{ marginBottom: 24 }}>
            <ShieldCheck size={18} className="alert-icon" />
            <div>
              Check your inbox (and spam folder) for the verification email from ImageVault.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleCheckVerified}
              disabled={checkingVerified}
            >
              {checkingVerified ? (
                <>
                  <RefreshCw size={18} className="spinner" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  I've Verified — Continue
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={handleResendVerification}
              disabled={resending}
            >
              {resending ? (
                <>
                  <RefreshCw size={18} className="spinner" />
                  Resending...
                </>
              ) : (
                <>
                  <Mail size={18} />
                  Resend Verification Email
                </>
              )}
            </button>
          </div>

          <div className="auth-redirect" style={{ marginTop: 20 }}>
            <Link to="/login">← Back to Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-logo-box">
            <Lock className="login-logo-icon" size={28} />
          </div>
          <h1 className="login-title">Create Account</h1>
          <p className="login-subtitle">Join ImageVault — secure, encrypted image records synced to all your devices.</p>
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="alert-banner error" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} className="alert-icon" />
            <div>{submitError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="signup-name" className="form-label">Full Name</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="signup-name"
                type="text"
                className={`form-input${errors.fullName ? ' error' : ''}`}
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: null })); }}
                disabled={loading}
                autoFocus
              />
            </div>
            {errors.fullName && <span className="form-hint" style={{ color: 'var(--danger)' }}>{errors.fullName}</span>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="signup-email" className="form-label">Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="signup-email"
                type="email"
                className={`form-input${errors.email ? ' error' : ''}`}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: null })); }}
                disabled={loading}
              />
            </div>
            {errors.email && <span className="form-hint" style={{ color: 'var(--danger)' }}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="signup-password" className="form-label">Password</label>
            <div className="input-with-icon password-input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input${errors.password ? ' error' : ''}`}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: null })); }}
                disabled={loading}
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
            {/* Strength bar */}
            {password && (
              <>
                <div className={`password-strength-bar ${strength}`} />
                <span className={`password-strength-label ${strength}`}>
                  {strength === 'weak' ? 'Weak password' : strength === 'medium' ? 'Medium strength' : 'Strong password'}
                </span>
              </>
            )}
            {errors.password && <span className="form-hint" style={{ color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="signup-confirm" className="form-label">Confirm Password</label>
            <div className="input-with-icon password-input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="signup-confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                className={`form-input${errors.confirmPassword ? ' error' : ''}`}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: null })); }}
                disabled={loading}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && <span className="form-hint" style={{ color: 'var(--danger)' }}>{errors.confirmPassword}</span>}
          </div>

          {/* Terms */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => { setAgreeTerms(e.target.checked); setErrors((p) => ({ ...p, agreeTerms: null })); }}
                disabled={loading}
              />
              I agree to the Terms of Service and Privacy Policy
            </label>
            {errors.agreeTerms && <span className="form-hint" style={{ color: 'var(--danger)', marginTop: 4, display: 'block' }}>{errors.agreeTerms}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="spinner" />
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-redirect">
          Already have an account?
          <Link to="/login"> Sign In</Link>
        </div>
      </div>
    </div>
  );
}

