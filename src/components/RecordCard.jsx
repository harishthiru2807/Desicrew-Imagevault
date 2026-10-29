import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, Calendar, Edit2, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { timeAgo, truncate } from '../utils/utils.js';

/**
 * RecordCard – Displays a single record in the grid.
 * @param {{ record: object, onDelete: (id)=>void }} props
 */
export default function RecordCard({ record, onDelete }) {
  const navigate = useNavigate();
  const { getImageUrl, categories } = useApp();
  const [imgUrl, setImgUrl] = useState(null);

  const category = categories.find(c => c.id === record.category);

  useEffect(() => {
    let objectUrl = null;
    const target = record.imageURL || (record.imageURLs && record.imageURLs[0]) || record.imageId;
    if (target) {
      if (typeof target === 'string' && (target.startsWith('http://') || target.startsWith('https://'))) {
        setImgUrl(target);
      } else {
        getImageUrl(target).then(url => {
          objectUrl = url;
          setImgUrl(url);
        });
      }
    } else {
      setImgUrl(null);
    }
    return () => {
      if (objectUrl && !objectUrl.startsWith('http')) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [record.imageURL, record.imageURLs, record.imageId, getImageUrl]);

  const handleCardClick = (e) => {
    // Don't navigate if action buttons clicked
    if (e.target.closest('.record-card-actions')) return;
    navigate(`/record/${record.id}`);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    navigate(`/edit/${record.id}`);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(record.id);
  };

  return (
    <article
      className="record-card fade-in"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(e)}
      aria-label={`Record: ${record.title}`}
    >
      {/* Image */}
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={record.title}
          className="record-card-image"
          loading="lazy"
        />
      ) : (
        <div className="record-card-placeholder" aria-hidden="true">
          <Image size={36} strokeWidth={1.5} />
        </div>
      )}

      {/* Body */}
      <div className="record-card-body">
        <h3 className="record-card-title">{record.title}</h3>

        {record.description && (
          <p className="record-card-desc">{truncate(record.description, 80)}</p>
        )}

        {/* Category badge */}
        {category && (
          <span
            className="badge"
            style={{
              background: category.color + '22',
              color: category.color,
              alignSelf: 'flex-start',
            }}
          >
            {category.name}
          </span>
        )}

        {/* Tags */}
        {record.tags?.length > 0 && (
          <div className="tags-list" style={{ marginTop: 2 }}>
            {record.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
            {record.tags.length > 3 && (
              <span className="tag">+{record.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="record-card-meta">
          <span className="record-card-date">
            <Calendar size={12} />
            {timeAgo(record.createdAt)}
          </span>
          <div className="record-card-actions">
            <button
              className="btn-icon"
              onClick={handleEdit}
              title="Edit record"
              aria-label="Edit record"
              id={`edit-record-${record.id}`}
            >
              <Edit2 size={15} />
            </button>
            <button
              className="btn-icon"
              onClick={handleDelete}
              title="Delete record"
              aria-label="Delete record"
              style={{ color: 'var(--danger)' }}
              id={`delete-record-${record.id}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
