import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, SortDesc, SortAsc, X, Image, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import RecordCard from '../components/RecordCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { debounce } from '../utils/utils.js';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'alpha', label: 'A–Z' },
  { value: 'alpha-desc', label: 'Z–A' },
];

export default function AllRecords() {
  const navigate = useNavigate();
  const { records, categories, removeRecord, loading } = useApp();
  const addToast = useToast();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [deleteId, setDeleteId] = useState(null);

  const handleSearchChange = useCallback(
    debounce((val) => setSearch(val), 200),
    [],
  );

  const filtered = useMemo(() => {
    let res = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.tags?.some(t => t.toLowerCase().includes(q)),
      );
    }
    if (activeCategory !== 'all') res = res.filter(r => r.category === activeCategory);
    switch (sort) {
      case 'newest': res.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case 'oldest': res.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'alpha': res.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'alpha-desc': res.sort((a, b) => b.title.localeCompare(a.title)); break;
    }
    return res;
  }, [records, search, activeCategory, sort]);

  const handleDelete = useCallback(async () => {
    try {
      await removeRecord(deleteId);
      addToast('Record deleted', 'success');
    } catch {
      addToast('Failed to delete', 'error');
    } finally {
      setDeleteId(null);
    }
  }, [deleteId, removeRecord, addToast]);

  if (loading) return <div className="page-content"><div className="page-loader"><div className="spinner" /></div></div>;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">All Records</h1>
          <p className="page-subtitle">{records.length} total record{records.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/add')} id="all-records-add-btn">
            <Plus size={15} />
            Add
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 12 }}>
        <Search size={18} className="search-icon" />
        <input
          type="search"
          className="form-control"
          placeholder="Search records…"
          defaultValue={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          id="all-records-search"
        />
        {search && (
          <button className="search-clear" onClick={() => { setSearch(''); document.getElementById('all-records-search').value = ''; }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category + Sort */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="filter-bar" style={{ flex: 1, margin: 0 }}>
          <button className={`filter-chip${activeCategory === 'all' ? ' active' : ''}`} onClick={() => setActiveCategory('all')}>All</button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`filter-chip${activeCategory === cat.id ? ' active' : ''}`}
              onClick={() => setActiveCategory(activeCategory === cat.id ? 'all' : cat.id)}
              style={activeCategory === cat.id ? {} : { borderColor: cat.color + '66' }}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <select
          className="form-control"
          style={{ width: 'auto', paddingLeft: 10, paddingRight: 10, fontSize: '0.8125rem' }}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          id="all-records-sort"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Count */}
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12 }}>
        Showing {filtered.length} of {records.length} records
        {(search || activeCategory !== 'all') && (
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => { setSearch(''); setActiveCategory('all'); document.getElementById('all-records-search').value = ''; }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {search || activeCategory !== 'all' ? <Search size={32} /> : <Image size={32} />}
          </div>
          <h3>{search || activeCategory !== 'all' ? 'No matches found' : 'No records yet'}</h3>
          <p>{search || activeCategory !== 'all' ? 'Try different search terms or filters' : 'Add your first image record to get started'}</p>
          {!search && activeCategory === 'all' && (
            <button className="btn btn-primary" onClick={() => navigate('/add')} id="all-records-empty-add">
              <Plus size={16} /> Add Record
            </button>
          )}
        </div>
      ) : (
        <div className="records-grid">
          {filtered.map(record => (
            <RecordCard key={record.id} record={record} onDelete={setDeleteId} />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Record"
        message="This record and its image will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
