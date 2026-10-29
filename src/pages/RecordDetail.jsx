import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, Calendar, Tag, Folder,
  Clock, Image, Download, Share2,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatDate, formatDateTime } from '../utils/utils.js';

export default function RecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { records, categories, removeRecord, getImageUrl } = useApp();
  const addToast = useToast();

  const [imgUrl, setImgUrl] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const record = records.find(r => r.id === id);
  const category = categories.find(c => c.id === record?.category);

  useEffect(() => {
    let url = null;
    const target = record?.imageURL || (record?.imageURLs && record?.imageURLs[0]) || record?.imageId;
    if (target) {
      if (typeof target === 'string' && (target.startsWith('http://') || target.startsWith('https://'))) {
        setImgUrl(target);
      } else {
        getImageUrl(target).then(u => {
          if (u) { url = u; setImgUrl(u); }
          else setImgError(true);
        }).catch(() => setImgError(true));
      }
    }
    return () => { if (url && !url.startsWith('http')) URL.revokeObjectURL(url); };
  }, [record?.imageURL, record?.imageURLs, record?.imageId, getImageUrl]);

  // Not found
  if (!record) {
    return (
      <div className="page-content fade-in">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
        <div className="empty-state">
          <div className="empty-state-icon"><Image size={32} /></div>
          <h3>Record not found</h3>
          <p>This record may have been deleted</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await removeRecord(id);
      addToast('Record deleted', 'success');
      navigate('/', { replace: true });
    } catch {
      addToast('Failed to delete record', 'error');
    }
  };

  const handleDownload = () => {
    if (!imgUrl) return;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `${record.title.replace(/[^\w\s]/g, '')}-image.jpg`;
    a.click();
  };

  return (
    <div className="page-content fade-in">
      {/* Back */}
      <button className="back-btn" onClick={() => navigate(-1)} id="detail-back-btn">
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>{record.title}</h1>
          {category && (
            <span className="badge" style={{ background: category.color + '22', color: category.color, marginTop: 4 }}>
              <Folder size={12} />
              {category.name}
            </span>
          )}
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/edit/${id}`)} id="detail-edit-btn">
            <Edit2 size={14} />
            Edit
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)} id="detail-delete-btn">
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        {imgUrl && !imgError ? (
          <>
            <img
              src={imgUrl}
              alt={record.title}
              style={{ width: '100%', maxHeight: 400, objectFit: 'contain', background: 'var(--bg-surface-2)', cursor: 'zoom-in' }}
              onClick={() => setLightbox(true)}
              onError={() => setImgError(true)}
              id="detail-image"
            />
            <div style={{ padding: '10px 16px', display: 'flex', gap: 8, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-ghost btn-sm" onClick={handleDownload} id="download-image-btn">
                <Download size={14} />
                Download
              </button>
              {navigator.share && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    fetch(imgUrl).then(r => r.blob()).then(blob => {
                      const file = new File([blob], `${record.title}.jpg`, { type: blob.type });
                      navigator.share({ files: [file], title: record.title }).catch(() => {});
                    });
                  }}
                  id="share-image-btn"
                >
                  <Share2 size={14} />
                  Share
                </button>
              )}
            </div>
          </>
        ) : record.imageId && imgError ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Image size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.875rem' }}>Image could not be loaded</p>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface-2)' }}>
            <Image size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.875rem' }}>No image attached</p>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 className="section-title">Details</h2>

        {record.description ? (
          <div style={{ marginBottom: 16 }}>
            <div className="form-label" style={{ marginBottom: 6 }}>Description</div>
            <p style={{ color: 'var(--text-primary)', lineHeight: 1.7, fontSize: '0.9375rem', whiteSpace: 'pre-wrap' }}>
              {record.description}
            </p>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>No description provided</p>
        )}

        <div className="divider" style={{ margin: '12px 0' }} />

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 4 }}>
              <Calendar size={14} />
              Record Date
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{formatDate(record.date) || '—'}</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 4 }}>
              <Clock size={14} />
              Created
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{formatDateTime(record.createdAt)}</div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 4 }}>
              <Clock size={14} />
              Last Updated
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{formatDateTime(record.updatedAt)}</div>
          </div>
        </div>

        {/* Tags */}
        {record.tags?.length > 0 && (
          <>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 8 }}>
                <Tag size={14} />
                Tags
              </div>
              <div className="tags-list">
                {record.tags.map(tag => (
                  <span key={tag} className="tag">#{tag}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && imgUrl && (
        <div
          className="modal-backdrop"
          onClick={() => setLightbox(false)}
          style={{ zIndex: 900, padding: 16, background: 'rgba(0,0,0,0.92)' }}
        >
          <img
            src={imgUrl}
            alt={record.title}
            style={{ maxWidth: '100%', maxHeight: '90dvh', objectFit: 'contain', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-xl)' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={showDelete}
        title="Delete Record"
        message={`"${record.title}" and its image will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
