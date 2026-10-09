import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

export default function ProfileSection({ user, onEditProfile, className = '' }) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const companyProfile = useSelector((s) => s.company?.profile);

  if (!user) return null;

  // For company users, display the company name and logo instead of personal name
  const isCompany = user.role === 'company';
  const displayName = isCompany
    ? (companyProfile?.companyName || user.fullName)
    : user.fullName;
  const displayAvatar = isCompany
    ? (companyProfile?.logo || user.profilePhoto || user.avatar)
    : (user.avatar || user.profilePhoto);
  
  const handleEditProfile = () => {
    setDropdownOpen(false);
    if (onEditProfile) {
      onEditProfile();
    }
  };
  
  return (
    <div className={`profile-section d-flex align-items-center gap-2 ${className}`} data-testid="profile-section">
      {/* User Profile Display */}
      <div className="dropdown">
        <div 
          className="d-flex align-items-center gap-2 dropdown-toggle"
          data-bs-toggle="dropdown"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          data-testid="profile-dropdown-toggle"
          style={{ cursor: 'pointer' }}
        >
          {/* Profile Picture */}
          {displayAvatar ? (
            <img 
              src={displayAvatar} 
              alt={displayName}
              className="rounded-circle"
              style={{ width: '32px', height: '32px', objectFit: 'cover' }}
            />
          ) : (
            <div 
              className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-semibold"
              style={{ width: '32px', height: '32px', fontSize: '14px' }}
            >
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          
          {/* User Name */}
          <span className="fw-medium text-dark">{displayName?.split(' ')[0] || displayName || 'Account'}</span>
        </div>
        
        <ul className="dropdown-menu dropdown-menu-end" data-testid="profile-dropdown-menu">
          {/* User Info Header */}
          <li className="dropdown-header">
            <div className="d-flex align-items-center gap-3">
              {displayAvatar ? (
                <img 
                  src={displayAvatar} 
                  alt={displayName}
                  className="rounded-circle"
                  style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                />
              ) : (
                <div 
                  className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-semibold"
                  style={{ width: '40px', height: '40px', fontSize: '16px' }}
                >
                  {displayName?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div className="fw-semibold">{displayName}</div>
                {isCompany && companyProfile?.verificationStatus === 'pending' && (
                  <div className="text-warning small">⏳ Pending approval</div>
                )}
                <div className="text-muted small d-flex align-items-center gap-1">
                  <span className={`badge bg-${getRoleBadgeColor(user.role)}`} style={{ fontSize: '0.65rem' }}>
                    {getRoleLabel(user.role)}
                  </span>
                  {user.isVerified && (
                    <span className="text-success" title="Verified">✓</span>
                  )}
                </div>
              </div>
            </div>
          </li>
          
          <li><hr className="dropdown-divider" /></li>
          
          {/* Edit Profile */}
          <li>
            <Link 
              className="dropdown-item" 
              to="/profile"
              onClick={handleEditProfile}
              data-testid="edit-profile-link"
            >
              👤 {t('profile.editProfile', 'Edit Profile')}
            </Link>
          </li>

          {/* Settings for non-admin, Admin Panel for admin */}
          {user.role === 'admin' ? (
            <li>
              <Link className="dropdown-item" to="/admin-panel" onClick={() => setDropdownOpen(false)}>
                ⚙️ Admin Panel
              </Link>
            </li>
          ) : (
            <li>
              <Link className="dropdown-item" to="/settings" onClick={() => setDropdownOpen(false)}>
                ⚙️ Settings
              </Link>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/**
 * Get badge color for user role
 */
function getRoleBadgeColor(role) {
  const colors = {
    admin:   'danger',
    broker:  'warning',
    company: 'primary',
    user:    'success',
  };
  return colors[role] || 'secondary';
}

/**
 * Get human-readable role label
 */
function getRoleLabel(role) {
  const labels = {
    admin:   'Admin',
    broker:  'Broker',
    company: 'Company',
    user:    'User',
  };
  return labels[role] || (role?.charAt(0).toUpperCase() + role?.slice(1));
}