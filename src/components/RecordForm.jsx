import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, X, Plus, Tag, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import ImagePicker from '../components/ImagePicker.jsx';
import { parseTags, tagsToString, formatDate } from '../utils/utils.js';

export default function RecordForm({ mode = 'add' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { records, categories, createRecord, updateRecord, getImageUrl, loading } = useApp();
  const addToast = useToast();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'other',
    tagsInput: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [imageBlob, setImageBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [removeImageFlag, setRemoveImageFlag] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { addCategory } = useApp();
  const isDirty = useRef(false);

  // For edit mode – load existing record
  useEffect(() => {
    if (mode === 'edit' && id) {
      const record = records.find(r => r.id === id);
      if (record) {
        setForm({
          title: record.title,
          description: record.description || '',
          category: record.category || 'other',
          tagsInput: tagsToString(record.tags),
          date: record.date || new Date().toISOString().split('T')[0],
        });
        // Load existing image preview
        const targetImg = record.imageURL || (record.imageURLs && record.imageURLs[0]) || record.imageId;
        if (targetImg) {
          if (typeof targetImg === 'string' && (targetImg.startsWith('http://') || targetImg.startsWith('https://'))) {
            setPreviewUrl(targetImg);
          } else {
            getImageUrl(targetImg).then(url => {
              if (url) setPreviewUrl(url);
            });
          }
        }
      }
    }
  }, [mode, id, records, getImageUrl]);

  // Track dirty state for navigation guard
  const handleChange = (field, value) => {
    isDirty.current = true;
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleImageChange = (blob, url) => {
    isDirty.current = true;
    setImageBlob(blob);
    setPreviewUrl(url);
    setRemoveImageFlag(false);
  };

  const handleImageRemove = () => {
    isDirty.current = true;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageBlob(null);
    setPreviewUrl(null);
    setRemoveImageFlag(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (form.title.trim().length > 120) errs.title = 'Title must be 120 characters or less';
    if (form.description.length > 2000) errs.description = 'Description must be 2000 characters or less';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const tags = parseTags(form.tagsInput);
      const formData = { ...form, tags };

      if (mode === 'add') {
        await createRecord(formData, imageBlob);
        addToast('Record created successfully!', 'success');
        navigate('/', { replace: true });
      } else {
        await updateRecord(id, formData, imageBlob, removeImageFlag);
        addToast('Record updated successfully!', 'success');
        navigate(`/record/${id}`, { replace: true });
      }
      isDirty.current = false;
    } catch (err) {
      addToast('Failed to save record: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isDirty.current) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave?')) return;
    }
    navigate(-1);
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
      addToast('Category already exists', 'error');
      return;
    }
    try {
      const cat = await addCategory(name);
      setForm(prev => ({ ...prev, category: cat.id }));
      setNewCategoryName('');
      setShowNewCategory(false);
      addToast('Category added!', 'success');
    } catch {
      addToast('Failed to add category', 'error');
    }
  };

  return (
    <div className="page-content fade-in">
      {/* Back */}
      <button className="back-btn" onClick={handleCancel} id="form-back-btn">
        <ArrowLeft size={16} />
        {mode === 'add' ? 'Cancel' : 'Back'}
      </button>

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{mode === 'add' ? 'Add New Record' : 'Edit Record'}</h1>
          <p className="page-subtitle">
            {mode === 'add' ? 'Capture and save a new image record' : 'Update the record details'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Image Section */}
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="section-title">Image</div>
          <ImagePicker
            value={imageBlob}
            previewUrl={previewUrl}
            onChange={handleImageChange}
            onRemove={handleImageRemove}
          />
        </div>

        {/* Details Section */}
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="section-title">Record Details</div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label required" htmlFor="record-title">Title</label>
            <input
              id="record-title"
              type="text"
              className={`form-control${errors.title ? ' error' : ''}`}
              placeholder="Enter a descriptive title…"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              maxLength={120}
              autoFocus={mode === 'add'}
            />
            {errors.title && <div className="form-error">{errors.title}</div>}
            <div className="form-hint">{form.title.length}/120 characters</div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="record-description">Description / Notes</label>
            <textarea
              id="record-description"
              className={`form-control${errors.description ? ' error' : ''}`}
              placeholder="Add any notes or details about this record…"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              maxLength={2000}
            />
            {errors.description && <div className="form-error">{errors.description}</div>}
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label" htmlFor="record-category">Category</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                id="record-category"
                className="form-control"
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                style={{ flex: 1 }}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowNewCategory(v => !v)}
                id="toggle-new-category-btn"
                title="Add new category"
              >
                <Plus size={16} />
              </button>
            </div>

            {showNewCategory && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="New category name…"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                  maxLength={40}
                  autoFocus
                  id="new-category-input"
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleAddCategory}
                  id="add-category-confirm-btn"
                >
                  Add
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label" htmlFor="record-tags">
              <Tag size={14} style={{ display: 'inline', marginRight: 4 }} />
              Tags
            </label>
            <input
              id="record-tags"
              type="text"
              className="form-control"
              placeholder="nature, vacation, work (comma separated)"
              value={form.tagsInput}
              onChange={(e) => handleChange('tagsInput', e.target.value)}
            />
            <div className="form-hint">Separate tags with commas</div>
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label" htmlFor="record-date">
              <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
              Date
            </label>
            <input
              id="record-date"
              type="date"
              className="form-control"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={handleCancel}
            disabled={submitting}
            id="cancel-form-btn"
          >
            <X size={16} />
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ flex: 2 }}
            disabled={submitting}
            id="save-record-btn"
          >
            {submitting ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</>
            ) : (
              <><Save size={16} /> {mode === 'add' ? 'Save Record' : 'Update Record'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
