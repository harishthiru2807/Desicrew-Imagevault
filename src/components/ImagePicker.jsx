import React, { useRef, useState, useCallback } from 'react';
import { Upload, Camera, X, RefreshCw, ImageOff } from 'lucide-react';
import { processImageFile } from '../services/imageService.js';

/**
 * ImagePicker – handles file upload, drag-and-drop, preview, replace, and remove.
 * @param {{ value: Blob|null, previewUrl: string|null, onChange: (blob, url)=>void, onRemove: ()=>void }} props
 */
export default function ImagePicker({ value, previewUrl, onChange, onRemove }) {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP, GIF, etc.)');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Image must be smaller than 25 MB');
      return;
    }
    setError('');
    setProcessing(true);
    try {
      const { blob, previewUrl: url } = await processImageFile(file, { compress: true });
      onChange(blob, url);
    } catch (err) {
      setError('Failed to process image: ' + err.message);
    } finally {
      setProcessing(false);
    }
  }, [onChange]);

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so re-selecting same file works
    e.target.value = '';
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  if (previewUrl) {
    return (
      <div className="image-preview-container">
        <img
          src={previewUrl}
          alt="Selected image preview"
          style={{ width: '100%', maxHeight: 280, objectFit: 'contain', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-lg)' }}
        />
        <div className="image-preview-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.9)' }}
            onClick={() => fileInputRef.current?.click()}
            id="replace-image-btn"
            title="Replace image"
          >
            <RefreshCw size={14} />
            Replace
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            style={{ backdropFilter: 'blur(8px)', background: 'rgba(239,68,68,0.9)' }}
            onClick={onRemove}
            id="remove-image-btn"
            title="Remove image"
          >
            <X size={14} />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleInputChange}
          aria-label="Replace image"
        />
      </div>
    );
  }

  return (
    <div>
      <div
        className={`image-upload-area${dragging ? ' drag-over' : ''}`}
        onClick={() => !processing && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        aria-label="Upload image"
        id="image-upload-area"
      >
        {processing ? (
          <>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <h4>Processing image…</h4>
          </>
        ) : (
          <>
            <Upload size={32} style={{ margin: '0 auto', color: 'var(--text-muted)' }} />
            <h4>Upload an Image</h4>
            <p>Drag &amp; drop or click to select · JPG, PNG, WebP</p>
            <p style={{ fontSize: '0.75rem', marginTop: 4 }}>Supports camera capture on mobile</p>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={processing}
          id="choose-file-btn"
        >
          <Upload size={14} />
          Choose File
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
          onClick={() => {
            // Open camera on mobile, fallback to file picker
            if (fileInputRef.current) {
              fileInputRef.current.capture = 'environment';
              fileInputRef.current.click();
            }
          }}
          disabled={processing}
          id="capture-camera-btn"
        >
          <Camera size={14} />
          Camera
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleInputChange}
        aria-label="Select image file"
      />

      {error && (
        <div className="form-error" style={{ marginTop: 8 }}>
          <ImageOff size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
