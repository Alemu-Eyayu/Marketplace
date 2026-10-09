import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import client from '../api/client';

const INDUSTRIES = [
  'Real Estate', 'Automotive', 'Banking and Finance', 'Construction',
  'Technology', 'Retail', 'Manufacturing', 'Agriculture',
  'Healthcare', 'Education', 'Hospitality', 'Other',
];

const BROKER_SPECIALIZATIONS = [
  'Residential Real Estate', 'Commercial Real Estate', 'Land and Plots',
  'Automotive Sales', 'Automotive Rental', 'Industrial Property',
  'Agricultural Land', 'Luxury Properties', 'Property Management',
  'Investment Advisory', 'Other',
];

const BROKER_STEPS = [
  { label: 'Personal Info', icon: '👤' },
  { label: 'Professional Details', icon: '💼' },
  { label: 'Location', icon: '📍' },
  { label: 'License and Docs', icon: '📄' },
  { label: 'Review', icon: '✅' },
];

const COMPANY_STEPS = [
  { label: 'Admin Account', icon: '👤' },
  { label: 'Company Info', icon: '🏢' },
  { label: 'Location and Web', icon: '🌐' },
  { label: 'Documents', icon: '📄' },
  { label: 'Review', icon: '✅' },
];

// ── Phone input with +251 prefix ─────────────────────────────────────────────
function PhoneInput({ value, onChange, name = 'phone', required = true, placeholder = '9 22 78 20 39' }) {
  // Strip +251 prefix for display; store full number in state
  const displayValue = value.startsWith('+251') ? value.slice(4) : value.startsWith('251') ? value.slice(3) : value.startsWith('0') ? value.slice(1) : value;

  function handleInput(e) {
    // Only allow digits
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    onChange({ target: { name, value: '+251' + digits } });
  }

  return (
    <div className="input-group">
      <span className="input-group-text fw-semibold" style={{ background: '#f8f9fa', letterSpacing: 1 }}>
        🇪🇹 +251
      </span>
      <input
        className="form-control"
        type="tel"
        name={name}
        value={displayValue}
        onChange={handleInput}
        placeholder={placeholder}
        maxLength={9}
        required={required}
        inputMode="numeric"
      />
    </div>
  );
}
function StepBar({ steps, current }) {
  return (
    <div className="d-flex align-items-center justify-content-center mb-4 flex-wrap gap-1">
      {steps.map((s, i) => (
        <div key={i} className="d-flex align-items-center">
          <div className="d-flex flex-column align-items-center" style={{ minWidth: 60 }}>
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
              style={{
                width: 36,
                height: 36,
                background: i < current ? '#198754' : i === current ? '#0d6efd' : '#dee2e6',
                color: i <= current ? '#fff' : '#6c757d',
                fontSize: 14,
              }}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <small
              className="text-center mt-1"
              style={{ fontSize: 10, color: i === current ? '#0d6efd' : '#6c757d' }}
            >
              {s.label}
            </small>
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                height: 2,
                width: 24,
                background: i < current ? '#198754' : '#dee2e6',
                marginBottom: 18,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── ReviewRow helper ──────────────────────────────────────────────────────────
function ReviewRow({ label, value }) {
  return (
    <div
      className="d-flex justify-content-between py-2"
      style={{ borderBottom: '1px solid #dee2e6' }}
    >
      <span className="text-muted" style={{ minWidth: 160 }}>{label}</span>
      <span className="fw-semibold text-end">{value || <em className="text-muted">—</em>}</span>
    </div>
  );
}

const USER_STEPS = [
  { label: 'Personal Info', icon: '👤' },
  { label: 'National ID',   icon: '🪪' },
  { label: 'Review',        icon: '✅' },
];

// ── Individual / User Form ────────────────────────────────────────────────────
function UserForm({ navigate, t }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    phone: '+251', fullName: '', password: '', dateOfBirth: '', nationalId: null,
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value, type, files } = e.target;
    if (type === 'file') setForm((f) => ({ ...f, [name]: files[0] }));
    else setForm((f) => ({ ...f, [name]: value }));
  }

  function validateStep() {
    if (step === 0) {
      if (!form.fullName.trim()) return 'Full name is required.';
      if (!form.phone || form.phone === '+251') return 'Phone number is required.';
      if (!form.password || form.password.length < 8) return 'Password must be at least 8 characters.';
    }
    if (step === 1) {
      if (!form.nationalId) return 'National ID photo is required.';
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => s + 1);
  }

  function back() { setError(''); setStep((s) => s - 1); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('phone', form.phone);
      fd.append('fullName', form.fullName);
      fd.append('password', form.password);
      fd.append('role', 'user');
      if (form.dateOfBirth) fd.append('dateOfBirth', form.dateOfBirth);
      if (form.nationalId) fd.append('nationalId', form.nationalId);

      const { data } = await client.post('/auth/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.autoVerified) {
        navigate('/login', { state: { message: 'Registration successful. Please log in. Your ID will be reviewed by an admin.' } });
      } else {
        navigate('/verify-otp', {
          state: { phone: form.phone, purpose: 'registration', devOtp: data.devOtp || null },
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <StepBar steps={USER_STEPS} current={step} />
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Step 0 — Personal Info */}
      {step === 0 && (
        <div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
            <input className="form-control" name="fullName" value={form.fullName} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">{t('auth.phone')} <span className="text-danger">*</span></label>
            <PhoneInput value={form.phone} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Date of Birth</label>
            <input className="form-control" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">{t('auth.password')} <span className="text-danger">*</span></label>
            <input className="form-control" type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} />
            <div className="form-text">At least 8 characters.</div>
          </div>
        </div>
      )}

      {/* Step 1 — National ID */}
      {step === 1 && (
        <div>
          <div className="alert alert-info py-2 small mb-3">
            🪪 Your national ID is used to verify your identity. It will only be seen by our admin team.
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">National ID Photo <span className="text-danger">*</span></label>
            <input
              className="form-control"
              type="file"
              name="nationalId"
              accept="image/jpeg,image/png"
              onChange={handleChange}
              required
            />
            <div className="form-text">Upload a clear photo of your national ID card (JPEG or PNG, max 5 MB).</div>
          </div>
          {form.nationalId && (
            <div className="alert alert-success py-2 small">
              ✓ {form.nationalId.name} selected
            </div>
          )}
          {form.nationalId && (
            <div className="mb-3">
              <img
                src={URL.createObjectURL(form.nationalId)}
                alt="National ID preview"
                className="img-fluid rounded-3 border"
                style={{ maxHeight: 200, objectFit: 'contain', width: '100%' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Review */}
      {step === 2 && (
        <form onSubmit={handleSubmit}>
          <h6 className="fw-semibold mb-3">Review your information</h6>
          <ReviewRow label="Full Name"    value={form.fullName} />
          <ReviewRow label="Phone"        value={form.phone} />
          <ReviewRow label="Date of Birth" value={form.dateOfBirth} />
          <ReviewRow label="National ID"  value={form.nationalId?.name} />
          <div className="alert alert-warning py-2 small mt-3">
            ⏳ After registration, an admin will review your national ID and activate your account. You will be notified once verified.
          </div>
          <button className="btn btn-success w-100 mt-2" type="submit" disabled={loading}>
            {loading ? 'Submitting…' : 'Create Account'}
          </button>
        </form>
      )}

      {/* Navigation */}
      {step < 2 && (
        <div className="d-flex gap-2 mt-3">
          {step > 0 && (
            <button type="button" className="btn btn-outline-secondary flex-fill" onClick={back}>← Back</button>
          )}
          <button type="button" className="btn btn-primary flex-fill" onClick={next}>Next →</button>
        </div>
      )}
      {step === 2 && (
        <button type="button" className="btn btn-outline-secondary w-100 mt-2" onClick={back}>← Back</button>
      )}
      <p className="mt-3 text-center small">
        Already have an account? <Link to="/login">{t('auth.login')}</Link>
      </p>
    </div>
  );
}

// ── Broker Form (multi-step) ──────────────────────────────────────────────────
function BrokerForm({ navigate }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    fullName: '', phone: '+251', password: '', dateOfBirth: '',
    businessLicense: '', licenseType: '', bio: '',
    specializations: [],
    location: '', city: '', region: '',
    email: '', website: '',
    licenseDoc: null,
    nationalId: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setForm((f) => ({ ...f, [name]: files[0] }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  function toggleSpecialization(spec) {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(spec)
        ? f.specializations.filter((s) => s !== spec)
        : [...f.specializations, spec],
    }));
  }

  function validateStep() {
    if (step === 0) {
      if (!form.fullName.trim()) return 'Full name is required.';
      if (!form.phone.trim()) return 'Phone number is required.';
      if (!form.password || form.password.length < 8) return 'Password must be at least 8 characters.';
    }
    if (step === 1) {
      if (!form.businessLicense.trim()) return 'Business license number is required.';
    }
    if (step === 3) {
      if (!form.licenseDoc) return 'License document is required.';
      if (!form.nationalId) return 'National ID photo is required.';
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => s + 1);
  }

  function back() {
    setError('');
    setStep((s) => s - 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('phone', form.phone);
      fd.append('fullName', form.fullName);
      fd.append('password', form.password);
      if (form.dateOfBirth) fd.append('dateOfBirth', form.dateOfBirth);
      fd.append('businessLicense', form.businessLicense);
      if (form.licenseType) fd.append('licenseType', form.licenseType);
      if (form.bio) fd.append('bio', form.bio);
      if (form.specializations.length) fd.append('specializations', form.specializations.join(','));
      if (form.location) fd.append('location', form.location);
      if (form.city) fd.append('city', form.city);
      if (form.region) fd.append('region', form.region);
      if (form.email) fd.append('email', form.email);
      if (form.website) fd.append('website', form.website);
      fd.append('licenseDoc', form.licenseDoc);
      if (form.nationalId) fd.append('nationalId', form.nationalId);

      const { data } = await client.post('/auth/register-broker', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.autoVerified) {
        navigate('/login', { state: { message: 'Broker account created. Please log in. Your license will be reviewed.' } });
      } else {
        navigate('/verify-otp', {
          state: { phone: form.phone, purpose: 'registration', devOtp: data.devOtp || null },
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <StepBar steps={BROKER_STEPS} current={step} />
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Step 0 — Personal Info */}
      {step === 0 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Full Name</label>
            <input className="form-control" name="fullName" value={form.fullName} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Phone</label>
            <PhoneInput value={form.phone} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Date of Birth</label>
            <input className="form-control" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" name="password" value={form.password} onChange={handleChange} minLength={8} required />
            <div className="form-text">At least 8 characters.</div>
          </div>
        </div>
      )}

      {/* Step 1 — Professional Details */}
      {step === 1 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Business License Number <span className="text-danger">*</span></label>
            <input className="form-control" name="businessLicense" value={form.businessLicense} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">License Type</label>
            <input className="form-control" name="licenseType" placeholder="e.g. Real Estate Broker" value={form.licenseType} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Bio / About</label>
            <textarea className="form-control" name="bio" rows={3} value={form.bio} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Specializations</label>
            <div className="d-flex flex-wrap gap-2 mt-1">
              {BROKER_SPECIALIZATIONS.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSpecialization(spec)}
                  className={`btn btn-sm ${form.specializations.includes(spec) ? 'btn-primary' : 'btn-outline-secondary'}`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Location */}
      {step === 2 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Address / Area</label>
            <input className="form-control" name="location" value={form.location} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">City</label>
            <input className="form-control" name="city" value={form.city} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Region</label>
            <input className="form-control" name="region" value={form.region} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Email (optional)</label>
            <input className="form-control" type="email" name="email" value={form.email} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Website (optional)</label>
            <input className="form-control" type="url" name="website" placeholder="https://" value={form.website} onChange={handleChange} />
          </div>
        </div>
      )}

      {/* Step 3 — Documents */}
      {step === 3 && (
        <div>
          <div className="alert alert-info py-2 small mb-3">
            📄 Please upload both your broker license and a national ID for identity verification.
          </div>

          {/* License Document */}
          <div className="mb-4">
            <label className="form-label fw-semibold">Broker License Document <span className="text-danger">*</span></label>
            <input
              className="form-control"
              type="file"
              name="licenseDoc"
              accept="image/*,.pdf"
              onChange={handleChange}
              required
            />
            <div className="form-text">Upload a scan or photo of your broker license (PDF or image, max 10 MB).</div>
            {form.licenseDoc && (
              <div className="alert alert-success py-2 small mt-2">
                ✓ {form.licenseDoc.name} selected
              </div>
            )}
          </div>

          {/* National ID */}
          <div className="mb-3">
            <label className="form-label fw-semibold">National ID Photo <span className="text-danger">*</span></label>
            <input
              className="form-control"
              type="file"
              name="nationalId"
              accept="image/jpeg,image/png"
              onChange={handleChange}
              required
            />
            <div className="form-text">Upload a clear photo of your national ID card (JPEG or PNG, max 10 MB).</div>
            {form.nationalId && (
              <div className="alert alert-success py-2 small mt-2">
                ✓ {form.nationalId.name} selected
              </div>
            )}
            {form.nationalId && (
              <img
                src={URL.createObjectURL(form.nationalId)}
                alt="National ID preview"
                className="img-fluid rounded-3 border mt-2"
                style={{ maxHeight: 180, objectFit: 'contain', width: '100%' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Step 4 — Review */}
      {step === 4 && (
        <form onSubmit={handleSubmit}>
          <h6 className="fw-semibold mb-3">Review your information</h6>
          <ReviewRow label="Full Name" value={form.fullName} />
          <ReviewRow label="Phone" value={form.phone} />
          <ReviewRow label="Date of Birth" value={form.dateOfBirth} />
          <ReviewRow label="Business License" value={form.businessLicense} />
          <ReviewRow label="License Type" value={form.licenseType} />
          <ReviewRow label="Specializations" value={form.specializations.join(', ')} />
          <ReviewRow label="Location" value={[form.location, form.city, form.region].filter(Boolean).join(', ')} />
          <ReviewRow label="Email" value={form.email} />
          <ReviewRow label="Website" value={form.website} />
          <ReviewRow label="License Document" value={form.licenseDoc?.name} />
          <ReviewRow label="National ID"      value={form.nationalId?.name} />
          <div className="alert alert-warning py-2 small mt-3">
            ⏳ After registration, an admin will review your documents and activate your broker account.
          </div>
          <button className="btn btn-success w-100 mt-3" type="submit" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Broker Registration'}
          </button>
        </form>
      )}

      {/* Navigation buttons (not on review step which has its own submit) */}
      {step < 4 && (
        <div className="d-flex gap-2 mt-3">
          {step > 0 && (
            <button type="button" className="btn btn-outline-secondary flex-fill" onClick={back}>
              ← Back
            </button>
          )}
          <button type="button" className="btn btn-primary flex-fill" onClick={next}>
            Next →
          </button>
        </div>
      )}
      {step === 4 && step > 0 && (
        <button type="button" className="btn btn-outline-secondary w-100 mt-2" onClick={back}>
          ← Back
        </button>
      )}
      <p className="mt-3 text-center small">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

// ── Company Form (multi-step) ─────────────────────────────────────────────────
function CompanyForm({ navigate }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    // Admin account
    fullName: '', phone: '+251', password: '', dateOfBirth: '',
    // Company info
    companyName: '', industry: '', contactEmail: '', contactPhone: '',
    businessRegistrationNumber: '', description: '', foundedDate: '',
    // Location and web
    address: '', website: '',
    // Document
    businessRegistrationDoc: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setForm((f) => ({ ...f, [name]: files[0] }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  function validateStep() {
    if (step === 0) {
      if (!form.fullName.trim()) return 'Full name is required.';
      if (!form.phone.trim()) return 'Phone number is required.';
      if (!form.password || form.password.length < 8) return 'Password must be at least 8 characters.';
    }
    if (step === 1) {
      if (!form.companyName.trim()) return 'Company name is required.';
      if (!form.industry) return 'Industry is required.';
      if (!form.contactEmail.trim()) return 'Contact email is required.';
      if (!form.contactPhone.trim()) return 'Contact phone is required.';
      if (!form.businessRegistrationNumber.trim()) return 'Business registration number is required.';
    }
    if (step === 3) {
      if (!form.businessRegistrationDoc) return 'Business registration document is required.';
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => s + 1);
  }

  function back() {
    setError('');
    setStep((s) => s - 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('phone', form.phone);
      fd.append('fullName', form.fullName);
      fd.append('password', form.password);
      if (form.dateOfBirth) fd.append('dateOfBirth', form.dateOfBirth);
      fd.append('companyName', form.companyName);
      fd.append('industry', form.industry);
      fd.append('contactEmail', form.contactEmail);
      fd.append('contactPhone', form.contactPhone);
      fd.append('businessRegistrationNumber', form.businessRegistrationNumber);
      if (form.description) fd.append('description', form.description);
      if (form.foundedDate) fd.append('foundedDate', form.foundedDate);
      if (form.address) fd.append('address', form.address);
      if (form.website) fd.append('website', form.website);
      fd.append('businessRegistrationDoc', form.businessRegistrationDoc);

      const { data } = await client.post('/auth/register-company', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.autoVerified) {
        navigate('/login', { state: { message: 'Company registration submitted. You can log in while your company is reviewed.' } });
      } else {
        navigate('/verify-otp', {
          state: { phone: form.phone, purpose: 'registration', devOtp: data.devOtp || null },
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <StepBar steps={COMPANY_STEPS} current={step} />
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Step 0 — Admin Account */}
      {step === 0 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Your Full Name <span className="text-danger">*</span></label>
            <input className="form-control" name="fullName" value={form.fullName} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Phone <span className="text-danger">*</span></label>
            <PhoneInput value={form.phone} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Date of Birth</label>
            <input className="form-control" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Password <span className="text-danger">*</span></label>
            <input className="form-control" type="password" name="password" value={form.password} onChange={handleChange} minLength={8} required />
            <div className="form-text">At least 8 characters.</div>
          </div>
        </div>
      )}

      {/* Step 1 — Company Info */}
      {step === 1 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Company Name <span className="text-danger">*</span></label>
            <input className="form-control" name="companyName" value={form.companyName} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Industry <span className="text-danger">*</span></label>
            <select className="form-select" name="industry" value={form.industry} onChange={handleChange} required>
              <option value="">Select industry…</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Contact Email <span className="text-danger">*</span></label>
            <input className="form-control" type="email" name="contactEmail" value={form.contactEmail} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Contact Phone <span className="text-danger">*</span></label>
            <input className="form-control" name="contactPhone" value={form.contactPhone} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Business Registration Number <span className="text-danger">*</span></label>
            <input className="form-control" name="businessRegistrationNumber" value={form.businessRegistrationNumber} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea className="form-control" name="description" rows={3} value={form.description} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Founded Date</label>
            <input className="form-control" type="date" name="foundedDate" value={form.foundedDate} onChange={handleChange} />
          </div>
        </div>
      )}

      {/* Step 2 — Location and Web */}
      {step === 2 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Address</label>
            <input className="form-control" name="address" value={form.address} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Website <span className="text-muted fw-normal">(optional)</span></label>
            <input className="form-control" type="url" name="website" placeholder="https://" value={form.website} onChange={handleChange} />
          </div>
        </div>
      )}

      {/* Step 3 — Documents */}
      {step === 3 && (
        <div>
          <div className="mb-3">
            <label className="form-label">Business Registration Document <span className="text-danger">*</span></label>
            <input
              className="form-control"
              type="file"
              name="businessRegistrationDoc"
              accept="image/*,.pdf"
              onChange={handleChange}
              required
            />
            <div className="form-text">Upload your official business registration certificate (PDF or image).</div>
          </div>
          {form.businessRegistrationDoc && (
            <div className="alert alert-success py-2">
              ✓ {form.businessRegistrationDoc.name} selected
            </div>
          )}
        </div>
      )}

      {/* Step 4 — Review */}
      {step === 4 && (
        <form onSubmit={handleSubmit}>
          <h6 className="fw-semibold mb-3">Review your information</h6>
          <p className="text-muted small mb-2">Admin Account</p>
          <ReviewRow label="Full Name" value={form.fullName} />
          <ReviewRow label="Phone" value={form.phone} />
          <ReviewRow label="Date of Birth" value={form.dateOfBirth} />
          <p className="text-muted small mt-3 mb-2">Company Details</p>
          <ReviewRow label="Company Name" value={form.companyName} />
          <ReviewRow label="Industry" value={form.industry} />
          <ReviewRow label="Contact Email" value={form.contactEmail} />
          <ReviewRow label="Contact Phone" value={form.contactPhone} />
          <ReviewRow label="Reg. Number" value={form.businessRegistrationNumber} />
          <ReviewRow label="Address" value={form.address} />
          <ReviewRow label="Website" value={form.website} />
          <ReviewRow label="Registration Doc" value={form.businessRegistrationDoc?.name} />
          <button className="btn btn-success w-100 mt-3" type="submit" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Company Registration'}
          </button>
        </form>
      )}

      {/* Navigation buttons */}
      {step < 4 && (
        <div className="d-flex gap-2 mt-3">
          {step > 0 && (
            <button type="button" className="btn btn-outline-secondary flex-fill" onClick={back}>
              ← Back
            </button>
          )}
          <button type="button" className="btn btn-primary flex-fill" onClick={next}>
            Next →
          </button>
        </div>
      )}
      {step === 4 && step > 0 && (
        <button type="button" className="btn btn-outline-secondary w-100 mt-2" onClick={back}>
          ← Back
        </button>
      )}
      <p className="mt-3 text-center small">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

// ── Main Register Page ────────────────────────────────────────────────────────
export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [role, setRole] = useState('user');

  return (
    <div className="auth-container">
      <div className="mb-4">
        <h2 className="mb-1">{t('auth.register')}</h2>
        <p className="text-muted small mb-3">Choose the type of account you want to create.</p>
        <div className="d-flex gap-2">
          {[
            { value: 'user',    label: 'Individual', icon: '👤', desc: 'Browse and buy listings' },
            { value: 'broker',  label: 'Broker',     icon: '🤝', desc: 'List and sell properties' },
            { value: 'company', label: 'Company',    icon: '🏢', desc: 'Register your business' },
          ].map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`flex-fill btn border rounded-3 py-2 px-2 text-start ${role === r.value ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ minWidth: 0 }}
            >
              <div style={{ fontSize: '1.4rem' }}>{r.icon}</div>
              <div className="fw-semibold small">{r.label}</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.75 }}>{r.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {role === 'user'    && <UserForm    navigate={navigate} t={t} />}
      {role === 'broker'  && <BrokerForm  navigate={navigate} />}
      {role === 'company' && <CompanyForm navigate={navigate} />}
    </div>
  );
}
