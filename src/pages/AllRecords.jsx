import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Image, Search } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import RecordCard from '../components/RecordCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import SearchFilters from '../components/SearchFilters.jsx';
import useRecordSearch from '../hooks/useRecordSearch.js';

export default function AllRecords() {
  const navigate = useNavigate();
  const { records, categories, removeRecord, loading } = useApp();
  const addToast = useToast();
  const [deleteId, setDeleteId] = useState(null);

  const {
    filtered,
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

  const hasFilters = searchQuery || activeFilterCount > 0;

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
        filtered={filtered.length}
        total={records.length}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
        searchInputId="all-records-search"
      />

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {hasFilters ? <Search size={32} /> : <Image size={32} />}
          </div>
          <h3>{hasFilters ? 'No images found' : 'No records yet'}</h3>
          <p>
            {hasFilters
              ? 'No images found. Try another keyword or adjust your filters.'
              : 'Add your first image record to get started'}
          </p>
          {!hasFilters && (
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
