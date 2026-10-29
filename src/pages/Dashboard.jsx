import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Filter, SortAsc, SortDesc, X, Image,
  LayoutGrid, List, BarChart2, Folder, Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import RecordCard from '../components/RecordCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { debounce, timeAgo } from '../utils/utils.js';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: SortDesc },
  { value: 'oldest', label: 'Oldest First', icon: SortAsc },
  { value: 'alpha', label: 'A → Z', icon: SortAsc },
  { value: 'alpha-desc', label: 'Z → A', icon: SortDesc },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { records, categories, removeRecord, loading } = useApp();
  const addToast = useToast();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [deleteId, setDeleteId] = useState(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Debounced search handler
  const handleSearchChange = useCallback(
    debounce((val) => setSearch(val), 200),
    [],
  );

  // Filtered + sorted records
  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.tags?.some(t => t.toLowerCase().includes(q)),
      );
    }

    if (activeCategory !== 'all') {
      result = result.filter(r => r.category === activeCategory);
    }

    switch (sort) {
      case 'newest': result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case 'oldest': result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'alpha': result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'alpha-desc': result.sort((a, b) => b.title.localeCompare(a.title)); break;
    }

    return result;
  }, [records, search, activeCategory, sort]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      await removeRecord(deleteId);
      addToast('Record deleted', 'success');
    } catch {
      addToast('Failed to delete record', 'error');
    } finally {
      setDeleteId(null);
    }
  }, [deleteId, removeRecord, addToast]);

  const recentRecords = useMemo(() =>
    [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3),
    [records],
  );

  const hasFilters = search || activeCategory !== 'all' || sort !== 'newest';

  if (loading && records.length === 0 && categories.length === 0) {
    return (
      <div className="page-content">
        <div className="page-loader"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">
      {/* ── Hero / Welcome ── */}
      <div style={{
        background: 'var(--accent-gradient)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px 20px',
        marginBottom: 20,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -20, right: -20,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, right: 40,
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{ fontSize: '0.8125rem', opacity: 0.85, marginBottom: 4, fontWeight: 500 }}>
          Welcome back 👋
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4, letterSpacing: '-0.02em' }}>
          ImageVault
        </h1>
        <p style={{ fontSize: '0.875rem', opacity: 0.85, marginBottom: 20 }}>
          Your personal image record manager
        </p>
        <button
          className="btn"
          style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--accent-dark)', fontWeight: 700 }}
          onClick={() => navigate('/add')}
          id="hero-add-btn"
        >
          <Plus size={16} />
          Add New Record
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--accent-light)' }}>
            <Image size={18} color="var(--accent)" />
          </div>
          <div className="stat-card-value">{records.length}</div>
          <div className="stat-card-label">Total Records</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#f0fdf4' }}>
            <Folder size={18} color="var(--success)" />
          </div>
          <div className="stat-card-value">{categories.length}</div>
          <div className="stat-card-label">Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#fefce8' }}>
            <Clock size={18} color="var(--warning)" />
          </div>
          <div className="stat-card-value">{recentRecords.length > 0 ? timeAgo(recentRecords[0]?.createdAt) : '—'}</div>
          <div className="stat-card-label">Last Added</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#fdf2f8' }}>
            <BarChart2 size={18} color="#ec4899" />
          </div>
          <div className="stat-card-value">{records.filter(r => r.imageId).length}</div>
          <div className="stat-card-label">With Images</div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="search-bar" style={{ marginBottom: 12 }}>
        <Search size={18} className="search-icon" />
        <input
          type="search"
          className="form-control"
          placeholder="Search by title, description, tags…"
          defaultValue={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          id="dashboard-search"
          aria-label="Search records"
        />
        {search && (
          <button className="search-clear" onClick={() => { setSearch(''); document.getElementById('dashboard-search').value = ''; }} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="filter-bar">
        <button
          className={`filter-chip${activeCategory === 'all' ? ' active' : ''}`}
          onClick={() => setActiveCategory('all')}
          id="filter-all"
        >
          All ({records.length})
        </button>
        {categories.map(cat => {
          const count = records.filter(r => r.category === cat.id).length;
          return (
            <button
              key={cat.id}
              className={`filter-chip${activeCategory === cat.id ? ' active' : ''}`}
              onClick={() => setActiveCategory(activeCategory === cat.id ? 'all' : cat.id)}
              style={activeCategory === cat.id ? {} : { borderColor: cat.color + '66' }}
              id={`filter-${cat.id}`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
          {hasFilters && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>filtered</span>}
        </div>

        {hasFilters && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(''); setActiveCategory('all'); setSort('newest'); document.getElementById('dashboard-search').value = ''; }}
            id="clear-filters-btn"
          >
            <X size={14} />
            Clear
          </button>
        )}

        {/* Sort */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowSortMenu(v => !v)}
            id="sort-btn"
          >
            <Filter size={14} />
            {SORT_OPTIONS.find(o => o.value === sort)?.label}
          </button>
          {showSortMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowSortMenu(false)} />
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 6,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
                zIndex: 20, minWidth: 160, overflow: 'hidden',
              }}>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '10px 14px',
                      fontSize: '0.875rem', fontWeight: sort === opt.value ? 600 : 400,
                      color: sort === opt.value ? 'var(--accent)' : 'var(--text-primary)',
                      background: sort === opt.value ? 'var(--accent-light)' : 'transparent',
                      transition: 'all var(--transition)',
                    }}
                    onClick={() => { setSort(opt.value); setShowSortMenu(false); }}
                    id={`sort-${opt.value}`}
                  >
                    <opt.icon size={14} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 2 }}>
          <button
            className={`btn-icon${viewMode === 'grid' ? '' : ''}`}
            style={{ color: viewMode === 'grid' ? 'var(--accent)' : 'var(--text-muted)', background: viewMode === 'grid' ? 'var(--bg-surface)' : 'transparent', borderRadius: 'var(--radius-sm)', padding: 6 }}
            onClick={() => setViewMode('grid')}
            title="Grid view"
            id="view-grid-btn"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className="btn-icon"
            style={{ color: viewMode === 'list' ? 'var(--accent)' : 'var(--text-muted)', background: viewMode === 'list' ? 'var(--bg-surface)' : 'transparent', borderRadius: 'var(--radius-sm)', padding: 6 }}
            onClick={() => setViewMode('list')}
            title="List view"
            id="view-list-btn"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* ── Records Grid / List ── */}
      {filteredRecords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {search || activeCategory !== 'all' ? <Search size={32} /> : <Image size={32} />}
          </div>
          {search || activeCategory !== 'all' ? (
            <>
              <h3>No records found</h3>
              <p>Try different search terms or clear filters</p>
              <button className="btn btn-secondary" onClick={() => { setSearch(''); setActiveCategory('all'); document.getElementById('dashboard-search').value = ''; }}>
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <h3>No records yet</h3>
              <p>Start building your image vault by adding your first record</p>
              <button className="btn btn-primary" onClick={() => navigate('/add')} id="empty-add-btn">
                <Plus size={16} />
                Add First Record
              </button>
            </>
          )}
        </div>
      ) : (
        <div
          className={viewMode === 'grid' ? 'records-grid' : ''}
          style={viewMode === 'list' ? { display: 'flex', flexDirection: 'column', gap: 8 } : {}}
        >
          {filteredRecords.map(record => (
            <RecordCard
              key={record.id}
              record={record}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Record"
        message="This record and its image will be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        confirmClass="btn-danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
