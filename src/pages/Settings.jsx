import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Moon, Sun, Download, Upload, Trash2, Database,
  Info, ChevronRight, Shield, Smartphone, AlertCircle,
  User, ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { getStorageStats } from '../services/database.js';
import { formatBytes, downloadJSON } from '../utils/utils.js';

export default function SettingsPage() {
  const { settings, toggleTheme, records, exportData, importData } = useApp();
  const { currentUser, userProfile } = useAuth();
  const addToast = useToast();

  const [stats, setStats] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    getStorageStats().then(setStats).catch(() => {});
  }, [records.length]);

  const handleExport = async () => {
    try {
      const data = await exportData();
      const filename = `imagevault-export-${new Date().toISOString().split('T')[0]}.json`;
      downloadJSON(data, filename);
      addToast('Data exported successfully!', 'success');
    } catch {
      addToast('Export failed', 'error');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.records || !Array.isArray(data.records)) throw new Error('Invalid format');
      await importData(data);
      addToast(`Imported ${data.records.length} records!`, 'success');
    } catch (err) {
      addToast('Import failed: ' + err.message, 'error');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Customize your ImageVault experience</p>
        </div>
      </div>

      {/* ── Account & Cloud Profile ── */}
      {currentUser && (
        <div className="card" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Account & Cloud Sync
          </div>
          <Link
            to="/profile"
            style={{ display: 'flex', alignItems: 'center', padding: '16px', gap: 14, textDecoration: 'none', color: 'inherit', transition: 'background var(--transition)' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={22} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {userProfile?.displayName || currentUser.email?.split('@')[0]}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={13} style={{ color: 'var(--success)' }} />
                {currentUser.email}
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
          </Link>
        </div>
      )}

      {/* ── Appearance ── */}
      <div className="card" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Appearance
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            {settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Theme</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              Currently: {settings.theme === 'dark' ? 'Dark' : 'Light'} mode
            </div>
          </div>
          <button
            className={`btn btn-sm ${settings.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleTheme}
            id="toggle-theme-btn"
          >
            {settings.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>

      {/* ── Storage ── */}
      <div className="card" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Storage
        </div>
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <Database size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Storage Usage</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              {stats ? (
                <>
                  {stats.recordCount} records · {stats.imageCount} images · {formatBytes(stats.imageSizeBytes)} used
                </>
              ) : 'Calculating…'}
            </div>
          </div>
        </div>

        {/* Export */}
        <button
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, width: '100%', borderBottom: '1px solid var(--border)', transition: 'background var(--transition)' }}
          onClick={handleExport}
          id="export-data-btn"
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <Download size={20} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Export Data</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Download all records as JSON</div>
          </div>
          <ChevronRight size={18} color="var(--text-muted)" />
        </button>

        {/* Import */}
        <label
          htmlFor="import-file"
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, cursor: 'pointer', transition: 'background var(--transition)', borderBottom: '1px solid var(--border)' }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-surface-2)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          id="import-data-label"
        >
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: '#fefce8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            {importing ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : <Upload size={20} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Import Data</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Restore from a JSON export file</div>
          </div>
          <ChevronRight size={18} color="var(--text-muted)" />
        </label>
        <input
          id="import-file"
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImport}
          disabled={importing}
        />

        {/* Clear data */}
        <button
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, width: '100%', transition: 'background var(--transition)' }}
          onClick={() => setShowClearConfirm(true)}
          id="clear-data-btn"
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--danger-light)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius)', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
            <Trash2 size={20} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--danger)' }}>Clear All Data</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Permanently delete all records and images</div>
          </div>
          <ChevronRight size={18} color="var(--text-muted)" />
        </button>
      </div>

      {/* ── About ── */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius)', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>ImageVault v1.0.0</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', lineHeight: 1.6 }}>
              A secure, private image record manager. All data is stored locally on your device using IndexedDB. No cloud, no accounts required.
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span className="badge badge-accent">
                <Smartphone size={11} />
                Mobile-First
              </span>
              <span className="badge badge-success">
                <Shield size={11} />
                100% Local
              </span>
              <span className="badge badge-neutral">
                <Database size={11} />
                IndexedDB
              </span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear All Data"
        message="This will permanently delete ALL records, images, and custom categories. This cannot be undone. Export your data first if you want a backup."
        confirmLabel="Clear Everything"
        onConfirm={async () => {
          try {
            // Clear IndexedDB by deleting and reinitializing
            indexedDB.deleteDatabase('ImageVaultDB');
            addToast('All data cleared. Reloading…', 'info');
            setTimeout(() => window.location.reload(), 1500);
          } catch {
            addToast('Failed to clear data', 'error');
          }
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
