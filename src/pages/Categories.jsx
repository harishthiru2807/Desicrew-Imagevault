import React, { useState } from 'react';
import { FolderOpen, Plus, Edit2, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const CATEGORY_COLORS = [
  '#0ea5e9', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981',
  '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316',
];

export default function Categories() {
  const { categories, records, addCategory, removeCategory } = useApp();
  const addToast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const recordCounts = categories.reduce((acc, cat) => {
    acc[cat.id] = records.filter(r => r.category === cat.id).length;
    return acc;
  }, {});

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) { setFormError('Category name is required'); return; }
    if (name.length > 40) { setFormError('Name must be 40 characters or less'); return; }
    if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
      setFormError('A category with this name already exists');
      return;
    }
    setSubmitting(true);
    try {
      await addCategory(name, newColor);
      addToast(`Category "${name}" added!`, 'success');
      setNewName('');
      setNewColor(CATEGORY_COLORS[0]);
      setShowForm(false);
      setFormError('');
    } catch {
      addToast('Failed to add category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const cat = categories.find(c => c.id === deletingId);
    const count = recordCounts[deletingId] || 0;
    if (count > 0) {
      addToast(`Cannot delete "${cat?.name}" — it has ${count} record(s). Move them first.`, 'error');
      setDeletingId(null);
      return;
    }
    try {
      await removeCategory(deletingId);
      addToast('Category deleted', 'success');
    } catch {
      addToast('Failed to delete category', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize your records into categories</p>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm(v => !v)}
            id="add-category-btn"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Cancel' : 'New Category'}
          </button>
        </div>
      </div>

      {/* New Category Form */}
      {showForm && (
        <div className="card slide-in" style={{ padding: 20, marginBottom: 16 }}>
          <div className="section-title">Create New Category</div>
          <form onSubmit={handleAddCategory}>
            <div className="form-group">
              <label className="form-label required" htmlFor="cat-name">Category Name</label>
              <input
                id="cat-name"
                type="text"
                className={`form-control${formError ? ' error' : ''}`}
                placeholder="e.g. Healthcare, Finance, Personal…"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setFormError(''); }}
                maxLength={40}
                autoFocus
              />
              {formError && <div className="form-error"><AlertCircle size={14} />{formError}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {CATEGORY_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: color,
                      border: newColor === color ? `3px solid var(--text-primary)` : '3px solid transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all var(--transition)',
                      boxShadow: newColor === color ? `0 0 0 2px var(--bg-surface), 0 0 0 4px ${color}` : 'none',
                    }}
                    onClick={() => setNewColor(color)}
                    aria-label={`Color ${color}`}
                  >
                    {newColor === color && <Check size={14} color="#fff" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', borderRadius: 'var(--radius-full)',
              background: newColor + '22', color: newColor,
              fontWeight: 600, fontSize: '0.875rem', marginBottom: 16,
            }}>
              <FolderOpen size={14} />
              {newName || 'Preview'}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowForm(false); setFormError(''); setNewName(''); }}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting} id="save-category-btn">
                {submitting ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Plus size={14} />}
                Create Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {categories.map(cat => (
          <div key={cat.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Color dot */}
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius)',
              background: cat.color + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: cat.color, flexShrink: 0,
            }}>
              <FolderOpen size={20} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                {cat.name}
                {cat.isDefault && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                    Default
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {recordCounts[cat.id] || 0} record{(recordCounts[cat.id] || 0) !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Color chip */}
            <span style={{
              padding: '3px 10px', borderRadius: 'var(--radius-full)',
              background: cat.color + '22', color: cat.color,
              fontSize: '0.75rem', fontWeight: 600,
            }}>
              {recordCounts[cat.id] || 0}
            </span>

            {/* Actions – only non-default can be deleted */}
            {!cat.isDefault && (
              <button
                className="btn-icon"
                style={{ color: 'var(--danger)' }}
                onClick={() => setDeletingId(cat.id)}
                title="Delete category"
                id={`delete-cat-${cat.id}`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><FolderOpen size={32} /></div>
          <h3>No categories</h3>
          <p>Add your first category to start organizing records</p>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Category"
        message={`Delete "${categories.find(c => c.id === deletingId)?.name}"? Records in this category will not be deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
