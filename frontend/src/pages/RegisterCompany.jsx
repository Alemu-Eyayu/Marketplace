import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

// Phone input with +251 prefix
function PhoneInput({ value, onChange, name = 'phone', placeholder = '9 22 78 20 39', required = true }) {
  const displayValue = value.startsWith('+251') ? value.slice(4) : value.startsWith('251') ? value.slice(3) : value.startsWith('0') ? value.slice(1) : value;
  function handleInput(e) {
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

const INDUSTRIES = [
  'Real Estate', 'Automotive', 'Banking & Finance', 'Construction',
  'Technology', 'Retail', 'Manufacturing', 'Agriculture',
  'Healthcare', 'Education', 'Hospitality', 'Other',
];

const STEPS = ['Your Account', 'Company Info', 'Registration Doc', 'Review & Submit'];

export default function RegisterCompany() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [docError, setDocError] = useState('');

  const [form, setForm] = useState({
    // Account
    fullName: '',
    phone: '+251',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    // Company
    companyName: '',
    industry: '',
    contactEmail: '',
    contactPhone: '+251',
    businessRegistrationNumber: '',
    businessRegistrationDoc: null,
    docFileName: '',
  });

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setDocError('Only JPEG, PNG, or PDF files are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocError('File must be 10 MB or less.');
      return;
    }
    setDocError('');
    setForm((f) => ({ ...f, businessRegistrationDoc: file, docFileName: file.name }));
  };

  const canProceedStep0 =
    form.fullName.trim() &&
    form.phone.trim() &&
    form.password.length >= 8 &&
    form.password === form.confirmPassword;

  const canProceedStep1 =
    form.companyName.trim() &&
    form.industry &&
    form.contactEmail.trim() &&
    form.contactPhone.trim();

  const canProceedStep2 =
    form.businessRegistrationNumber.trim() &&
    form.businessRegistrationDoc &&
    !docError;

  const handleNext = () => {
    setError('');
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      // Account fields
      fd.append('fullName', form.fullName);
      fd.append('phone', form.phone);
      fd.append('password', form.password);
      if (form.dateOfBirth) fd.append('dateOfBirth', form.dateOfBirth);
      // Company fields
      fd.append('companyName', form.companyName);
      fd.append('industry', form.industry);
      fd.append('contactEmail', form.contactEmail);
      fd.append('contactPhone', form.contactPhone);
      fd.append('businessRegistrationNumber', form.businessRegistrationNumber);
      fd.append('businessRegistrationDoc', form.businessRegistrationDoc);

      const { data } = await client.post('/auth/register-company', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.autoVerified) {
        setSubmitted(true);
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
  };

  if (submitted) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 text-center">
            <div style={{ fontSize: '4rem' }}>🏢</div>
            <h2 className="mt-3">Registration Submitted!</h2>
            <p className="text-muted">
              Your account has been created and your company registration is under review.
              We'll notify you once it's approved — then you can log in to access your Company Dashboard.
            </p>
            <Link to="/login" className="btn btn-primary rounded-pill px-4">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-7">
          <div className="mb-4">
            <h2 className="mb-1">Register as a Company</h2>
            <p className="text-muted mb-0">
              Create your account and register your business in one step.
            </p>
            <p className="text-muted small">
              Already have an account?{' '}
              <Link to="/login">Log in</Link>
              {' · '}
              Registering as an individual?{' '}
              <Link to="/register">Sign up here</Link>
            </p>
          </div>

          {/* Step indicator */}
          <div className="d-flex align-items-center mb-4 gap-2 flex-wrap">
            {STEPS.map((label, i) => (
              <div key={i} className="d-flex align-items-center gap-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                  style={{
                    width: 32, height: 32, fontSize: '0.85rem',
                    background: i < step ? 'var(--bs-success)' : i === step ? 'var(--bs-primary)' : '#dee2e6',
                    color: i <= step ? '#fff' : '#6c757d',
                    flexShrink: 0,
                  }}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`small ${i === step ? 'fw-semibold' : 'text-muted'}`}>{label}</span>
                {i < STEPS.length - 1 && <div style={{ width: 20, height: 2, background: '#dee2e6', flexShrink: 0 }} />}
              </div>
            ))}
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="card shadow-sm">
            <div className="card-body p-4">

              {/* ── Step 0: Account Info ── */}
              {step === 0 && (
                <div>
                  <h5 className="mb-3">Your Account</h5>
                  <div className="mb-3">
                    <label className="form-label">Full Name *</label>
                    <input
                      className="form-control"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Abebe Kebede"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Phone Number *</label>
                    <PhoneInput value={form.phone} onChange={handleChange} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Date of Birth <span className="text-muted small">(optional, must be 18+)</span></label>
                    <input
                      className="form-control"
                      type="date"
                      name="dateOfBirth"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Password *</label>
                    <input
                      className="form-control"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="At least 8 characters"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Confirm Password *</label>
                    <input
                      className="form-control"
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repeat your password"
                      required
                    />
                    {form.confirmPassword && form.password !== form.confirmPassword && (
                      <div className="text-danger small mt-1">Passwords do not match.</div>
                    )}
                  </div>
                  <button
                    className="btn btn-primary w-100"
                    onClick={handleNext}
                    disabled={!canProceedStep0}
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* ── Step 1: Company Info ── */}
              {step === 1 && (
                <div>
                  <h5 className="mb-3">Company Information</h5>
                  <div className="mb-3">
                    <label className="form-label">Company Name *</label>
                    <input
                      className="form-control"
                      name="companyName"
                      value={form.companyName}
                      onChange={handleChange}
                      placeholder="e.g. Ethio Construction PLC"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Industry *</label>
                    <select
                      className="form-select"
                      name="industry"
                      value={form.industry}
                      onChange={handleChange}
                    >
                      <option value="">Select industry...</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Company Contact Email *</label>
                    <input
                      className="form-control"
                      type="email"
                      name="contactEmail"
                      value={form.contactEmail}
                      onChange={handleChange}
                      placeholder="info@company.com"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Company Contact Phone *</label>
                    <PhoneInput value={form.contactPhone} onChange={handleChange} name="contactPhone" placeholder="9 11 00 00 00" />
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary flex-fill" onClick={handleBack}>← Back</button>
                    <button
                      className="btn btn-primary flex-fill"
                      onClick={handleNext}
                      disabled={!canProceedStep1}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Registration Doc ── */}
              {step === 2 && (
                <div>
                  <h5 className="mb-3">Business Registration</h5>
                  <div className="mb-3">
                    <label className="form-label">Registration Number *</label>
                    <input
                      className="form-control"
                      name="businessRegistrationNumber"
                      value={form.businessRegistrationNumber}
                      onChange={handleChange}
                      placeholder="e.g. 123456/2023"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Registration Document *{' '}
                      <small className="text-muted">(JPEG, PNG, or PDF — max 10 MB)</small>
                    </label>
                    <input
                      className="form-control"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileChange}
                    />
                    {docError && <div className="text-danger small mt-1">{docError}</div>}
                    {form.docFileName && !docError && (
                      <div className="text-success small mt-1">✓ {form.docFileName}</div>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary flex-fill" onClick={handleBack}>← Back</button>
                    <button
                      className="btn btn-primary flex-fill"
                      onClick={handleNext}
                      disabled={!canProceedStep2}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Review & Submit ── */}
              {step === 3 && (
                <form onSubmit={handleSubmit}>
                  <h5 className="mb-3">Review & Submit</h5>

                  <h6 className="text-muted small text-uppercase mb-2">Your Account</h6>
                  <div className="list-group list-group-flush mb-3">
                    {[
                      ['Full Name', form.fullName],
                      ['Phone', form.phone],
                    ].map(([label, value]) => (
                      <div key={label} className="list-group-item d-flex justify-content-between px-0">
                        <span className="text-muted">{label}</span>
                        <span className="fw-semibold">{value}</span>
                      </div>
                    ))}
                  </div>

                  <h6 className="text-muted small text-uppercase mb-2">Company Details</h6>
                  <div className="list-group list-group-flush mb-4">
                    {[
                      ['Company Name', form.companyName],
                      ['Industry', form.industry],
                      ['Contact Email', form.contactEmail],
                      ['Contact Phone', form.contactPhone],
                      ['Registration Number', form.businessRegistrationNumber],
                      ['Document', form.docFileName],
                    ].map(([label, value]) => (
                      <div key={label} className="list-group-item d-flex justify-content-between px-0">
                        <span className="text-muted">{label}</span>
                        <span className="fw-semibold">{value}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-muted small mb-3">
                    By submitting, you confirm all information is accurate. Your company registration
                    will be reviewed by our team. You can log in immediately, and your Company Dashboard
                    will be activated once approved.
                  </p>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary flex-fill"
                      onClick={handleBack}
                      disabled={loading}
                    >
                      ← Back
                    </button>
                    <button type="submit" className="btn btn-success flex-fill" disabled={loading}>
                      {loading ? (
                        <><span className="spinner-border spinner-border-sm me-1" /> Submitting...</>
                      ) : (
                        '🏢 Submit Registration'
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
