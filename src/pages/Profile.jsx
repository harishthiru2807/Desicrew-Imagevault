import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  ShieldCheck,
  Calendar,
  Clock,
  Camera,
  Save,
  LogOut,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Key,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatDate, formatDateTime } from '../utils/utils.js';

export default function Profile() {
  const { currentUser, userProfile, updateProfile, updateAvatar, logout, changePassword } = useAuth();
  const { hasLocalData, migrateLocalToCloud } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || ''
  );
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Change Password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmNewPw, setShowConfirmNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwError, setPwError] = useState(null);

  const fileInputRef = useRef(null);

  // Check if user has email+password provider
  const hasPasswordProvider = currentUser?.providerData?.some(
    (p) => p.providerId === 'password'
  );

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.show('Display name cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim() });
      toast.show('Profile updated successfully!', 'success');
    } catch (err) {
      toast.show(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.show('Please select a valid image file', 'error');
      return;
    }

    setAvatarLoading(true);
    try {
      await updateAvatar(file);
      toast.show('Profile photo updated!', 'success');
    } catch (err) {
      toast.show(err.message || 'Failed to upload photo', 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const result = await migrateLocalToCloud((current, total) => {
        setMigrationStatus(`Migrating record ${current} of ${total}...`);
      });
      toast.show(`Successfully migrated ${result.migrated} records to Cloud!`, 'success');
      setMigrationStatus(null);
    } catch (err) {
      toast.show(err.message || 'Migration failed', 'error');
    } finally {
      setMigrating(false);
    }
  };

  const handleConfirmLogout = async () => {
    try {
      await logout();
      toast.show('Signed out successfully', 'info');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.show('Failed to sign out: ' + err.message, 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null);

    if (!currentPw) { setPwError('Please enter your current password.'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmNewPw) { setPwError('New passwords do not match.'); return; }

    setChangingPw(true);
    try {
      await changePassword(currentPw, newPw);
      toast.show('Password updated successfully!', 'success');
      setCurrentPw('');
      setNewPw('');
      setConfirmNewPw('');
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPwError('Current password is incorrect.');
      } else if (code === 'auth/requires-recent-login') {
        setPwError('Please sign out and sign in again before changing your password.');
      } else {
        setPwError(err.message || 'Failed to update password.');
      }
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Account & Profile</h1>
        <p className="page-subtitle">Manage your credentials, synced devices, and cloud profile.</p>
      </div>

      <div className="profile-layout">
        {/* Avatar & Display Name Card */}
        <div className="card profile-card">
          <div className="avatar-section">
            <div className="avatar-wrapper">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={displayName}
                  className="avatar-image-large"
                />
              ) : (
                <div className="avatar-placeholder-large">
                  <User size={48} />
                </div>
              )}
              <button
                type="button"
                className="avatar-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                title="Change Photo"
              >
                {avatarLoading ? <RefreshCw size={16} className="spinner" /> : <Camera size={16} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarSelect}
              />
            </div>

            <div className="avatar-info">
              <h2 className="profile-name">{userProfile?.displayName || 'ImageVault User'}</h2>
              <span className="profile-email-badge">
                <Mail size={14} />
                {currentUser?.email}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="form-group">
              <label htmlFor="displayName" className="form-label">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                className="form-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw size={16} className="spinner" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>

        {/* Account Details & Session Info */}
        <div className="card profile-details-card">
          <h3 className="section-title">Security & Session Details</h3>

          <div className="info-list">
            <div className="info-row">
              <span className="info-label">
                <ShieldCheck size={16} className="info-icon text-success" />
                Email Status
              </span>
              <span className="info-value">
                <span className="badge badge-success">
                  <CheckCircle2 size={12} />
                  Verified
                </span>
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">
                <Key size={16} className="info-icon" />
                User ID (UID)
              </span>
              <span className="info-value font-mono text-truncate" title={currentUser?.uid}>
                {currentUser?.uid}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">
                <Calendar size={16} className="info-icon" />
                Member Since
              </span>
              <span className="info-value">
                {formatDate(userProfile?.createdAt || currentUser?.metadata?.creationTime)}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">
                <Clock size={16} className="info-icon" />
                Last Login
              </span>
              <span className="info-value">
                {formatDateTime(userProfile?.lastLoginAt || currentUser?.metadata?.lastSignInTime)}
              </span>
            </div>
          </div>

          {/* Local Migration Section */}
          {hasLocalData && (
            <div className="migration-card">
              <div className="migration-header">
                <UploadCloud size={20} className="text-primary" />
                <div>
                  <strong>Local Records Detected</strong>
                  <p className="migration-desc">
                    You have records stored locally in your browser's IndexedDB. Migrate them to your Firebase Cloud account so they sync across all your devices.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleMigrate}
                disabled={migrating}
              >
                {migrating ? (
                  <>
                    <RefreshCw size={14} className="spinner" />
                    {migrationStatus || 'Migrating...'}
                  </>
                ) : (
                  <>
                    <UploadCloud size={14} />
                    Migrate to Cloud
                  </>
                )}
              </button>
            </div>
          )}

          {/* Logout Action */}
          <div className="profile-actions">
            <button
              type="button"
              className="btn btn-danger btn-block"
              onClick={() => setShowLogoutDialog(true)}
            >
              <LogOut size={16} />
              Sign Out of ImageVault
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Card — only for email+password accounts */}
      {hasPasswordProvider && (
        <div className="card profile-details-card" style={{ marginTop: 24 }}>
          <h3 className="section-title">
            <KeyRound size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Change Password
          </h3>

          {pwError && (
            <div className="alert-banner error" style={{ marginBottom: 16 }}>
              <AlertTriangle size={18} className="alert-icon" />
              <div>{pwError}</div>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="profile-form">
            <div className="form-group">
              <label htmlFor="current-pw" className="form-label">Current Password</label>
              <div className="input-with-icon password-input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="current-pw"
                  type={showCurrentPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter current password"
                  value={currentPw}
                  onChange={(e) => { setCurrentPw(e.target.value); setPwError(null); }}
                  disabled={changingPw}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowCurrentPw((v) => !v)}
                  tabIndex={-1}
                >
                  {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="new-pw" className="form-label">New Password</label>
              <div className="input-with-icon password-input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="new-pw"
                  type={showNewPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="New password (min 8 characters)"
                  value={newPw}
                  onChange={(e) => { setNewPw(e.target.value); setPwError(null); }}
                  disabled={changingPw}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPw((v) => !v)}
                  tabIndex={-1}
                >
                  {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-new-pw" className="form-label">Confirm New Password</label>
              <div className="input-with-icon password-input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="confirm-new-pw"
                  type={showConfirmNewPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Repeat new password"
                  value={confirmNewPw}
                  onChange={(e) => { setConfirmNewPw(e.target.value); setPwError(null); }}
                  disabled={changingPw}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmNewPw((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirmNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={changingPw}>
              {changingPw ? (
                <>
                  <RefreshCw size={16} className="spinner" />
                  Updating Password...
                </>
              ) : (
                <>
                  <Key size={16} />
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={showLogoutDialog}
        title="Sign Out"
        message="Are you sure you want to sign out? Your cloud data will remain safely stored in Firebase, and you will need to verify with email OTP on your next login."
        confirmText="Sign Out"
        confirmType="danger"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </div>
  );
}
