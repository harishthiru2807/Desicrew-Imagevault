import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Image,
  LayoutGrid, List, BarChart2, Folder, Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import RecordCard from '../components/RecordCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import SearchFilters from '../components/SearchFilters.jsx';
import useRecordSearch from '../hooks/useRecordSearch.js';
import { timeAgo } from '../utils/utils.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const { records, categories, removeRecord, loading } = useApp();
  const addToast = useToast();

  const [viewMode, setViewMode] = useState('grid');
  const [deleteId, setDeleteId] = useState(null);

  const {
    filtered: filteredRecords,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    activeTags,
    setActiveTags,
    dateRange,
    setDateRange,
    descriptionQuery,
    setDescriptionQuery,
    sort,
    setSort,
    activeFilterCount,
    resetFilters,
    allTags,
  } = useRecordSearch({ records, categories });

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

  const hasFilters = searchQuery || activeFilterCount > 0;

  if (loading && records.length === 0 && categories.length === 0) {
    return (
      <div className="page-content">
        <div className="page-loader"><div className="spinner" /></div>
      </div>
    );
  }

  // View mode toggle rendered as rightContent for the SearchFilters toolbar
  const viewModeToggle = (
    <div style={{ display: 'flex', gap: 2, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius)', padding: 2 }}>
      <button
        className="btn-icon"
        style={{ color: viewMode === 'grid' ? 'var(--accent)' : 'var(--text-muted)', background: viewMode === 'grid' ? 'var(--bg-surface)' : 'transparent', borderRadius: 'var(--radius-sm)', padding: 6 }}
        onClick={() => setViewMode('grid')}
        title="Grid view"
        id="view-grid-btn"
        type="button"
      >
        <LayoutGrid size={16} />
      </button>
      <button
        className="btn-icon"
        style={{ color: viewMode === 'list' ? 'var(--accent)' : 'var(--text-muted)', background: viewMode === 'list' ? 'var(--bg-surface)' : 'transparent', borderRadius: 'var(--radius-sm)', padding: 6 }}
        onClick={() => setViewMode('list')}
        title="List view"
        id="view-list-btn"
        type="button"
      >
        <List size={16} />
      </button>
    </div>
  );

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

      {/* ── Search + Filters (with view mode toggle as rightContent) ── */}
      <SearchFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        categories={categories}
        activeTags={activeTags}
        onTagsChange={setActiveTags}
        allTags={allTags}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        descriptionQuery={descriptionQuery}
        onDescriptionChange={setDescriptionQuery}
        sort={sort}
        onSortChange={setSort}
        filtered={filteredRecords.length}
        total={records.length}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
        searchInputId="dashboard-search"
        rightContent={viewModeToggle}
      />

      {/* ── Records Grid / List ── */}
      {filteredRecords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {hasFilters ? <Search size={32} /> : <Image size={32} />}
          </div>
          {hasFilters ? (
            <>
              <h3>No images found</h3>
              <p>No images found. Try another keyword or adjust your filters.</p>
              <button className="btn btn-secondary" onClick={() => { resetFilters(); setSearchQuery(''); }}>
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
