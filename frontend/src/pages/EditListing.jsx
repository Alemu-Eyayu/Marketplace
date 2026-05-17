import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

export default function EditListing() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', price: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client.get(`/listings/${id}`).then(({ data }) => {
      const l = data.listing;
      setForm({ title: l.title, description: l.description, price: l.price });
    }).catch(() => setError(t('errors.notFound')));
  }, [id]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await client.put(`/listings/${id}`, form);
      navigate(`/listings/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--primary)', fontWeight: 600, fontSize: '0.88rem',
          padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
          marginBottom: 16,
        }}
      >
        <i className="bi bi-arrow-left"></i> Back
      </button>

      <h2>{t('listing.edit')}</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>{t('listing.title')}</label>
          <input className="form-control" name="title" value={form.title} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label>{t('listing.description')}</label>
          <textarea className="form-control" name="description" value={form.description} onChange={handleChange} required />
        </div>
        <div className="mb-3">
          <label>{t('listing.price')}</label>
          <input className="form-control" name="price" type="number" value={form.price} onChange={handleChange} required />
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? t('common.loading') : t('common.save')}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
