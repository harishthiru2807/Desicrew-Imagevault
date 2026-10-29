import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Image, FolderOpen, Plus, Settings, LayoutGrid, User, LogOut, LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/nav.css';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/records', icon: Image, label: 'Records' },
  { to: '/add', icon: Plus, label: 'Add', isAdd: true },
  { to: '/categories', icon: FolderOpen, label: 'Categories' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map(({ to, icon: Icon, label, end, isAdd }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `bottom-nav-item${isActive ? ' active' : ''}${isAdd ? ' add-btn' : ''}`
          }
          aria-label={label}
        >
          <span className="nav-icon-bg">
            <Icon size={isAdd ? 22 : 20} strokeWidth={isAdd ? 2.5 : 2} />
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const { currentUser, userProfile, logout } = useAuth();

  return (
    <aside className="sidebar" role="navigation" aria-label="Sidebar navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <LayoutGrid size={22} />
        </div>
        <span className="sidebar-logo-text">
          Image<span>Vault</span>
        </span>
      </div>

      {/* Nav Items */}
      <nav className="sidebar-nav">
        <div className="sidebar-label">Navigation</div>
        {NAV_ITEMS.filter(i => !i.isAdd).map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
          >
            <Icon size={18} className="sidebar-icon" />
            <span>{label}</span>
          </NavLink>
        ))}
        {currentUser && (
          <NavLink
            to="/profile"
            className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
          >
            <User size={18} className="sidebar-icon" />
            <span>Profile</span>
          </NavLink>
        )}
      </nav>

      {/* User profile & actions */}
      <div className="sidebar-footer">
        <button
          className="sidebar-add-btn"
          onClick={() => navigate('/add')}
          id="sidebar-add-record-btn"
        >
          <Plus size={18} />
          Add New Record
        </button>

        {currentUser ? (
          <div className="sidebar-user-pill">
            <NavLink to="/profile" className="sidebar-user-info" title="View Profile">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName || 'User'}
                  className="sidebar-user-avatar"
                />
              ) : (
                <div className="sidebar-user-initials">
                  {(userProfile?.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="sidebar-user-meta">
                <span className="sidebar-user-name">
                  {userProfile?.displayName || currentUser.email?.split('@')[0]}
                </span>
                <span className="sidebar-user-email">{currentUser.email}</span>
              </div>
            </NavLink>
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="sidebar-user-pill">
            <NavLink to="/login" className="sidebar-user-info" title="Sign In with Firebase">
              <div className="sidebar-user-initials" style={{ background: 'var(--border)' }}>
                <User size={16} color="var(--text-secondary)" />
              </div>
              <div className="sidebar-user-meta">
                <span className="sidebar-user-name">Guest Mode</span>
                <span className="sidebar-user-email" style={{ color: 'var(--accent)' }}>Sign In / Sync</span>
              </div>
            </NavLink>
            <NavLink to="/login" className="sidebar-logout-btn" title="Sign In">
              <LogIn size={16} />
            </NavLink>
          </div>
        )}
      </div>
    </aside>
  );
}
