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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatDate, formatDateTime } from '../utils/utils.js';

export default function Profile() {
  const { currentUser, userProfile, updateProfile, updateAvatar, logout } = useAuth();
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

  const fileInputRef = useRef(null);

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
