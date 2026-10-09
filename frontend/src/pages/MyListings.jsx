import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import client from '../api/client';
import PlanSelectionModal from '../components/PlanSelectionModal';

const STATUS_COLORS = { active: 'success', inactive: 'secondary', expired: 'warning', removed: 'danger' };

export default function MyListings() {
  const { t } = useTranslation();
  const user = useSelector((s) => s.auth.user);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [planModal, setPlanModal] = useState(false);

  useEffect(() => { fetchListings(); }, []);

  async function fetchListings() {
    try {
      const { data } = await client.get('/listings/my');
      setListings(data.listings);
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id, action) {
    try {
      await client.patch(`/listings/${id}/status`, { action });
      fetchListings();
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(t('common.confirm'))) return;
    try {
      await client.delete(`/listings/${id}`);
      setListings((ls) => ls.filter((l) => l._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    }
  }

  if (loading) return <div className="container py-4">{t('common.loading')}</div>;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>{t('nav.listings')}</h2>
        {user?.role !== 'admin' && (
          <button className="btn btn-primary" onClick={() => setPlanModal(true)}>
            {t('listing.create')}
          </button>
        )}
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {listings.length === 0 && <p>{t('listing.noListingsYet')}</p>}
      <div className="list-group">
        {listings.map((l) => (
          <div key={l._id} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <Link to={`/listings/${l._id}`}><strong>{l.title}</strong></Link>
              <span className={`badge bg-${STATUS_COLORS[l.status]} ms-2`}>{t(`listing.status.${l.status}`)}</span>
              {l.isFeatured && <span className="badge bg-warning text-dark ms-1">{t('listing.featured')}</span>}
              <div className="text-muted small">{l.price} {l.currency} · {t('listing.viewCount')}: {l.viewCount}</div>
            </div>
            <div className="d-flex gap-2">
              <Link to={`/listings/${l._id}/edit`} className="btn btn-sm btn-outline-secondary">{t('listing.edit')}</Link>
              {l.status === 'active' && (
                <button className="btn btn-sm btn-outline-warning" onClick={() => handleAction(l._id, 'deactivate')}>{t('listing.deactivate')}</button>
              )}
              {l.status === 'inactive' && (
                <button className="btn btn-sm btn-outline-success" onClick={() => handleAction(l._id, 'activate')}>{t('listing.reactivate')}</button>
              )}
              {l.status === 'expired' && (
                <button className="btn btn-sm btn-outline-primary" onClick={() => handleAction(l._id, 'renew')}>{t('listing.renew')}</button>
              )}
              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(l._id)}>{t('listing.delete')}</button>
            </div>
          </div>
        ))}
      </div>

      {planModal && (
        <PlanSelectionModal
          userRole={user?.role}
          onClose={() => setPlanModal(false)}
        />
      )}
    </div>
  );
}
