import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Confirmation dialog modal.
 * @param {{ isOpen, title, message, confirmLabel, confirmClass, onConfirm, onCancel }} props
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  confirmClass = 'btn-danger',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onCancel?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="drag-handle" style={{ marginBottom: 0 }} />
        <div className="modal-header">
          <div
            style={{
              width: 40, height: 40, borderRadius: 'var(--radius)',
              background: 'var(--danger-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--danger)', flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="modal-title" id="confirm-title">{title}</div>
          </div>
          <button className="btn-icon" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onCancel} id="confirm-cancel-btn">
            Cancel
          </button>
          <button
            className={`btn ${confirmClass} btn-sm`}
            onClick={onConfirm}
            id="confirm-action-btn"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
