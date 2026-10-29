import { useState, useMemo, useEffect, useCallback, useRef } from 'react';

const DEFAULT_DATE_RANGE = { preset: 'all', startDate: null, endDate: null };

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function toDateOnly(date) {
  // Returns YYYY-MM-DD string in local time
  return date.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
}

function applyDateFilter(records, dateRange) {
  if (!dateRange || dateRange.preset === 'all') return records;

  const now = new Date();
  const todayStr = toDateOnly(now);

  if (dateRange.preset === 'today') {
    return records.filter(r => {
      const d = parseDate(r.createdAt);
      if (!d) return true; // include if invalid
      return toDateOnly(d) === todayStr;
    });
  }

  if (dateRange.preset === 'last7') {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);
    return records.filter(r => {
      const d = parseDate(r.createdAt);
      if (!d) return true;
      return d >= cutoff;
    });
  }

  if (dateRange.preset === 'last30') {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    cutoff.setHours(0, 0, 0, 0);
    return records.filter(r => {
      const d = parseDate(r.createdAt);
      if (!d) return true;
      return d >= cutoff;
    });
  }

  if (dateRange.preset === 'custom') {
    return records.filter(r => {
      const d = parseDate(r.createdAt);
      if (!d) return true;
      if (dateRange.startDate) {
        const start = new Date(dateRange.startDate);
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (dateRange.endDate) {
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }

  return records;
}

function sortRecords(records, sort) {
  const arr = [...records];
  switch (sort) {
    case 'newest':
      arr.sort((a, b) => {
        const da = parseDate(a.createdAt);
        const db = parseDate(b.createdAt);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da;
      });
      break;
    case 'oldest':
      arr.sort((a, b) => {
        const da = parseDate(a.createdAt);
        const db = parseDate(b.createdAt);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
      });
      break;
    case 'alpha':
      arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'alpha-desc':
      arr.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      break;
    case 'date-asc':
      arr.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });
      break;
    case 'date-desc':
      arr.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });
      break;
    default:
      break;
  }
  return arr;
}

export default function useRecordSearch({ records = [], categories = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTags, setActiveTags] = useState([]);
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);
  const [descriptionQuery, setDescriptionQuery] = useState('');
  const [sort, setSort] = useState('newest');

  const debouncedSearch = useDebounce(searchQuery, 300);
  const debouncedDescQuery = useDebounce(descriptionQuery, 300);

  const toggleTag = useCallback((tag) => {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );
  }, []);

  const resetFilters = useCallback(() => {
    setActiveCategory('all');
    setActiveTags([]);
    setDateRange(DEFAULT_DATE_RANGE);
    setDescriptionQuery('');
    setSort('newest');
    // Note: searchQuery is intentionally NOT reset here;
    // it has its own clear button per spec.
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set();
    records.forEach(r => {
      if (Array.isArray(r.tags)) r.tags.forEach(t => tagSet.add(t));
    });
    return [...tagSet].sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filtered = useMemo(() => {
    let res = [...records];

    // Main text search (title + description + tags)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      res = res.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (Array.isArray(r.tags) ? r.tags.join(' ') : '').toLowerCase().includes(q),
      );
    }

    // Category filter
    if (activeCategory !== 'all') {
      res = res.filter(r => r.category === activeCategory);
    }

    // Tags filter (AND logic — must have ALL selected tags)
    if (activeTags.length > 0) {
      res = res.filter(r =>
        Array.isArray(r.tags) &&
        activeTags.every(t => r.tags.includes(t)),
      );
    }

    // Date range filter (on createdAt)
    res = applyDateFilter(res, dateRange);

    // Description keyword filter
    if (debouncedDescQuery.trim()) {
      const dq = debouncedDescQuery.trim().toLowerCase();
      res = res.filter(r => (r.description || '').toLowerCase().includes(dq));
    }

    // Sort
    res = sortRecords(res, sort);

    return res;
  }, [records, debouncedSearch, activeCategory, activeTags, dateRange, debouncedDescQuery, sort]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeCategory !== 'all') count++;
    if (activeTags.length > 0) count++;
    if (dateRange.preset !== 'all') count++;
    if (descriptionQuery.trim()) count++;
    return count;
  }, [activeCategory, activeTags, dateRange, descriptionQuery]);

  return {
    filtered,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    activeTags,
    setActiveTags,
    toggleTag,
    dateRange,
    setDateRange,
    descriptionQuery,
    setDescriptionQuery,
    sort,
    setSort,
    activeFilterCount,
    resetFilters,
    allTags,
  };
}
