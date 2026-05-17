import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCompanyProfile,
  fetchCompanyListings,
  submitContactInquiry,
  clearInquirySent,
  clearCompanyError,
} from '../store/companySlice';

export default function CompanyProfile() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { profile, listings, pagination, loading, error, inquirySent } = useSelector((s) => s.company);
  const { user } = useSelector((s) => s.auth);

  const [page, setPage] = useState(1);
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', message: '' });
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    dispatch(fetchCompanyProfile(id));
    dispatch(fetchCompanyListings({ id, page: 1 }));
    return () => { dispatch(clearInquirySent()); dispatch(clearCompanyError()); };
  }, [dispatch, id]);

  useEffect(() => {
    dispatch(fetchCompanyListings({ id, page }));
  }, [dispatch, id, page]);

  const handleContactChange = (e) => setContactForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactError('');
    if (contactForm.message.length > 1000) {
      setContactError('Message must not exceed 1000 characters.');
      return;
    }
    const result = await dispatch(submitContactInquiry({ id, ...contactForm }));
    if (result.error) setContactError(result.payload);
  };

  if (loading && !profile) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
        <Link to="/" className="btn btn-outline-secondary">← Back</Link>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="container py-4">
      {/* Company Header */}
      <div className="card mb-4">
        {profile.coverPhoto && (
          <img src={profile.coverPhoto} alt="cover" className="card-img-top" style={{ height: 200, objectFit: 'cover' }} />
        )}
        <div className="card-body">
          <div className="d-flex align-items-start gap-3">
            {profile.logo
              ? <img src={profile.logo} alt={profile.companyName} className="rounded border" style={{ width: 72, height: 72, objectFit: 'cover' }} />
              : <div className="rounded bg-primary d-flex align-items-center justify-content-center text-white" style={{ width: 72, height: 72, fontSize: '2rem' }}>🏢</div>
            }
            <div className="flex-grow-1">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h3 className="mb-0">{profile.companyName}</h3>
                {profile.verificationStatus === 'verified' && (
                  <span className="badge bg-success">✓ Verified</span>
                )}
              </div>
              <p className="text-muted mb-2">{profile.industry}</p>
              {profile.description && <p className="mb-2">{profile.description}</p>}

              {/* Contact channels */}
              <div className="d-flex flex-wrap gap-3 mt-2">
                {profile.contactPhone && (
                  <a href={`tel:${profile.contactPhone}`} className="text-decoration-none text-muted small">
                    📞 {profile.contactPhone}
                  </a>
                )}
                {profile.contactEmail && (
                  <a href={`mailto:${profile.contactEmail}`} className="text-decoration-none text-muted small">
                    ✉️ {profile.contactEmail}
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-decoration-none text-muted small">
                    🌐 {profile.website}
                  </a>
                )}
              </div>
            </div>

            {/* Contact button */}
            {user && (
              <button
                className="btn btn-primary rounded-pill px-4"
                onClick={() => setShowContact((v) => !v)}
              >
                💬 Contact Company
              </button>
            )}
          </div>

          {/* Inline contact form */}
          {showContact && (
            <div className="mt-4 border-top pt-3">
              {inquirySent ? (
                <div className="alert alert-success">
                  ✓ Your inquiry has been sent. The company will get back to you.
                </div>
              ) : (
                <form onSubmit={handleContactSubmit}>
                  <h6 className="mb-3">Send an Inquiry</h6>
                  {contactError && <div className="alert alert-danger py-2">{contactError}</div>}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <input
                        className="form-control" name="name" placeholder="Your name"
                        value={contactForm.name} onChange={handleContactChange} required
                      />
                    </div>
                    <div className="col-md-6">
                      <input
                        className="form-control" name="phone" placeholder="Your phone"
                        value={contactForm.phone} onChange={handleContactChange} required
                      />
                    </div>
                    <div className="col-12">
                      <textarea
                        className="form-control" name="message" rows={3}
                        placeholder="Your message (max 1000 characters)"
                        value={contactForm.message} onChange={handleContactChange}
                        maxLength={1000} required
                      />
                      <small className="text-muted">{contactForm.message.length}/1000</small>
                    </div>
                    <div className="col-12">
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                        Send Inquiry
                      </button>
                      <button type="button" className="btn btn-outline-secondary ms-2" onClick={() => setShowContact(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Listings */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Listings ({pagination.total || 0})</h5>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: '3rem' }}>📋</div>
          <p>No active listings.</p>
        </div>
      ) : (
        <>
          <div className="row g-3">
            {listings.map((l) => (
              <div key={l._id} className="col-sm-6 col-lg-4">
                <Link to={`/listings/${l._id}`} className="text-decoration-none">
                  <div className="card h-100 hover-lift">
                    {l.images?.[0]
                      ? <img src={l.images[0]} alt={l.title} className="card-img-top" style={{ height: 160, objectFit: 'cover' }} />
                      : <div className="card-img-top bg-light d-flex align-items-center justify-content-center" style={{ height: 160, fontSize: '2.5rem' }}>
                          {l.categorySlug === 'jobs' ? '💼' : l.categorySlug === 'real-estate' ? '🏠' : l.categorySlug === 'automotive' ? '🚗' : '📦'}
                        </div>
                    }
                    <div className="card-body">
                      <h6 className="card-title mb-1">{l.title}</h6>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="badge bg-light text-dark">{l.categorySlug?.replace('-', ' ')}</span>
                        {l.categorySlug !== 'jobs' && (
                          <span className="fw-bold text-primary">{l.price?.toLocaleString()} ETB</span>
                        )}
                      </div>
                      {l.location?.city && (
                        <p className="text-muted small mb-0 mt-1">📍 {l.location.city}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="d-flex justify-content-center gap-2 mt-4">
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className="btn btn-sm disabled">
                {page} / {pagination.pages}
              </span>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page === pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
