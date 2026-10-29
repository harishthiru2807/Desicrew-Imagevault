import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Filter, ChevronDown, ChevronUp, Tag } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'alpha', label: 'Title A→Z' },
  { value: 'alpha-desc', label: 'Title Z→A' },
  { value: 'date-asc', label: 'Record Date ↑' },
  { value: 'date-desc', label: 'Record Date ↓' },
];

const DATE_PRESETS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
];

function getDateRangeLabel(dateRange) {
  const preset = DATE_PRESETS.find(p => p.value === dateRange.preset);
  if (!preset || dateRange.preset === 'all') return null;
  if (dateRange.preset === 'custom') {
    const parts = [];
    if (dateRange.startDate) parts.push(`From ${dateRange.startDate}`);
    if (dateRange.endDate) parts.push(`To ${dateRange.endDate}`);
    return parts.length > 0 ? parts.join(' ') : 'Custom Range';
  }
  return preset.label;
}

export default function SearchFilters({
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  categories = [],
  activeTags = [],
  onTagsChange,
  allTags = [],
  dateRange,
  onDateRangeChange,
  descriptionQuery,
  onDescriptionChange,
  sort,
  onSortChange,
  filtered = 0,
  total = 0,
  activeFilterCount = 0,
  onReset,
  searchInputId = 'search-input',
  rightContent,
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const searchRef = useRef(null);

  // Sync the controlled input value with external state changes (e.g. on reset)
  useEffect(() => {
    if (searchRef.current && searchRef.current.value !== searchQuery) {
      searchRef.current.value = searchQuery;
    }
  }, [searchQuery]);

  const handleSearchInput = useCallback((e) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  const handleSearchClear = useCallback(() => {
    onSearchChange('');
    if (searchRef.current) searchRef.current.value = '';
    if (searchRef.current) searchRef.current.focus();
  }, [onSearchChange]);

  const handleClearAll = useCallback(() => {
    onSearchChange('');
    if (searchRef.current) searchRef.current.value = '';
    onReset();
  }, [onSearchChange, onReset]);

  const handleTagToggle = useCallback((tag) => {
    if (activeTags.includes(tag)) {
      onTagsChange(activeTags.filter(t => t !== tag));
    } else {
      onTagsChange([...activeTags, tag]);
    }
  }, [activeTags, onTagsChange]);

  const handleRemoveTag = useCallback((tag) => {
    onTagsChange(activeTags.filter(t => t !== tag));
  }, [activeTags, onTagsChange]);

  const hasAnyClear = activeFilterCount > 0 || searchQuery;
  const dateRangeLabel = getDateRangeLabel(dateRange);
  const currentCategoryObj = activeCategory !== 'all'
    ? categories.find(c => c.id === activeCategory)
    : null;

  return (
    <div className="search-filter-wrapper">
      {/* ── Search Bar ── */}
      <div className="search-bar" style={{ marginBottom: 10 }}>
        <Search size={18} className="search-icon" />
        <input
          ref={searchRef}
          id={searchInputId}
          type="search"
          className="form-control"
          placeholder="Search records…"
          defaultValue={searchQuery}
          onChange={handleSearchInput}
          aria-label="Search records"
        />
        {searchQuery && (
          <button
            className="search-clear"
            onClick={handleSearchClear}
            aria-label="Clear search"
            type="button"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Toolbar Row ── */}
      <div className="search-filter-toolbar">
        {/* Filter Toggle */}
        <button
          type="button"
          className="btn btn-secondary btn-sm filter-toggle-btn"
          onClick={() => setPanelOpen(v => !v)}
          aria-expanded={panelOpen}
          aria-controls="filter-panel"
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="filter-count-badge" aria-label={`${activeFilterCount} active filters`}>
              {activeFilterCount}
            </span>
          )}
          {panelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Sort Select */}
        <select
          className="form-control"
          style={{ width: 'auto', paddingLeft: 10, paddingRight: 10, fontSize: '0.8125rem', flex: 'none' }}
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Sort records"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Result Count */}
        <div className="result-count-row" style={{ margin: 0, flex: 1 }}>
          <span>Showing {filtered} of {total} records</span>
          {hasAnyClear && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleClearAll}
              style={{ padding: '2px 8px' }}
            >
              <X size={12} style={{ marginRight: 3 }} />
              Clear All
            </button>
          )}
        </div>

        {/* Optional right content (e.g. view mode toggle) */}
        {rightContent && (
          <div style={{ marginLeft: 'auto' }}>
            {rightContent}
          </div>
        )}
      </div>

      {/* ── Collapsible Filter Panel ── */}
      {panelOpen && (
        <div className="filter-panel fade-in" id="filter-panel" role="region" aria-label="Filters">

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="filter-section">
              <div className="active-filters-row">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active:</span>

                {currentCategoryObj && (
                  <span className="active-filter-pill">
                    {currentCategoryObj.name}
                    <button
                      type="button"
                      onClick={() => onCategoryChange('all')}
                      aria-label={`Remove category filter: ${currentCategoryObj.name}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                )}

                {activeTags.map(tag => (
                  <span key={tag} className="active-filter-pill">
                    <Tag size={10} />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      aria-label={`Remove tag filter: ${tag}`}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {dateRangeLabel && (
                  <span className="active-filter-pill">
                    {dateRangeLabel}
                    <button
                      type="button"
                      onClick={() => onDateRangeChange({ preset: 'all', startDate: null, endDate: null })}
                      aria-label="Remove date filter"
                    >
                      <X size={11} />
                    </button>
                  </span>
                )}

                {descriptionQuery?.trim() && (
                  <span className="active-filter-pill">
                    Desc: "{descriptionQuery.trim()}"
                    <button
                      type="button"
                      onClick={() => onDescriptionChange('')}
                      aria-label="Remove description keyword filter"
                    >
                      <X size={11} />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Category Section */}
          <div className="filter-section">
            <div className="filter-section-label">Category</div>
            <div className="filter-chips-scroll">
              <button
                type="button"
                className={`filter-chip${activeCategory === 'all' ? ' active' : ''}`}
                onClick={() => onCategoryChange('all')}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`filter-chip${activeCategory === cat.id ? ' active' : ''}`}
                  onClick={() => onCategoryChange(activeCategory === cat.id ? 'all' : cat.id)}
                  style={activeCategory === cat.id ? {} : { borderColor: cat.color ? cat.color + '66' : undefined }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tags Section */}
          {allTags.length > 0 && (
            <div className="filter-section">
              <div className="filter-section-label">Tags</div>
              <div className="filter-chips-scroll" style={{ marginBottom: activeTags.length > 0 ? 8 : 0 }}>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className={`filter-chip${activeTags.includes(tag) ? ' active' : ''}`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {activeTags.length > 0 && (
                <div className="active-filters-row" style={{ marginBottom: 0 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Selected:</span>
                  {activeTags.map(tag => (
                    <span key={tag} className="active-filter-pill">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        aria-label={`Remove tag: ${tag}`}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload Date Section */}
          <div className="filter-section">
            <div className="filter-section-label">Upload Date</div>
            <div className="date-preset-row">
              {DATE_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  type="button"
                  className={`filter-chip${dateRange.preset === preset.value ? ' active' : ''}`}
                  onClick={() => onDateRangeChange({
                    preset: preset.value,
                    startDate: preset.value === 'custom' ? dateRange.startDate : null,
                    endDate: preset.value === 'custom' ? dateRange.endDate : null,
                  })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {dateRange.preset === 'custom' && (
              <div className="date-range-inputs">
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    From
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateRange.startDate || ''}
                    onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value || null })}
                    max={dateRange.endDate || undefined}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    To
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateRange.endDate || ''}
                    onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value || null })}
                    min={dateRange.startDate || undefined}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description Keywords Section */}
          <div className="filter-section">
            <div className="filter-section-label">Description Keywords</div>
            <input
              type="text"
              className="form-control"
              placeholder="Search within descriptions…"
              value={descriptionQuery}
              onChange={(e) => onDescriptionChange(e.target.value)}
              aria-label="Search description keywords"
            />
          </div>

          {/* Reset Button */}
          {activeFilterCount > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onReset}
              >
                <X size={13} style={{ marginRight: 4 }} />
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
