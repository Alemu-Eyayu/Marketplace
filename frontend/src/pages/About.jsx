import { Link } from 'react-router-dom';
import heroBg from '../assets/home.jpg';

const STEPS = [
  { num: '01', icon: '📝', title: 'Create Free Account',  desc: 'Sign up in 2 minutes and verify your phone number to get started.' },
  { num: '02', icon: '🔍', title: 'Browse Listings',      desc: 'Search properties, vehicles, jobs and more across all of Ethiopia.' },
  { num: '03', icon: '💬', title: 'Connect Securely',     desc: 'Chat with sellers, brokers and companies through our secure platform.' },
  { num: '04', icon: '🤝', title: 'Close the Deal',       desc: 'Agree on terms and complete your transaction directly with the seller.' },
];

const STATS = [
  { value: '50K+',  label: 'Active Listings' },
  { value: '120K+', label: 'Registered Users' },
  { value: '13',    label: 'Categories' },
  { value: '11',    label: 'Regions Covered' },
];

const VALUES = [
  { icon: '🔒', title: 'Trust & Safety',    desc: 'Every account is phone-verified. Listings are moderated to keep the marketplace clean and safe.' },
  { icon: '⚡', title: 'Speed',             desc: 'Post a listing in under 3 minutes. Our streamlined flow gets you live fast.' },
  { icon: '🌍', title: 'Local First',       desc: 'Built specifically for Ethiopia — Amharic support, local regions, and Ethiopian payment methods.' },
  { icon: '💼', title: 'Pro Tools',         desc: 'Brokers and companies get dedicated dashboards, analytics, and premium placement options.' },
  { icon: '📱', title: 'Mobile Ready',      desc: 'Fully responsive on any device. Browse and post from anywhere in the country.' },
  { icon: '🆓', title: 'Free to Start',     desc: 'Create an account and post your first listing at no cost. Upgrade only when you need more reach.' },
];

const USER_STEPS = [
  { title: 'Create Your Account',  desc: 'Sign up with your phone number and verify it with OTP. Complete your profile to build trust with sellers.' },
  { title: 'Browse Listings',      desc: 'Search through verified listings across Ethiopia. Filter by location, price, category, and condition.' },
  { title: 'Contact the Seller',   desc: 'Message sellers or brokers directly through our platform. Ask questions and schedule viewings.' },
  { title: 'Close the Deal',       desc: 'Agree on terms and complete your transaction. Use our messaging system to coordinate the handover.' },
];

const BROKER_STEPS = [
  { title: 'Register as Broker',        desc: 'Sign up and get verified. Build a trusted professional profile that buyers can rely on.' },
  { title: 'Post Your Listings',        desc: 'Add photos, detailed descriptions, and pricing. Supports real estate, automotive, jobs, and more.' },
  { title: 'Connect with Buyers',       desc: 'Receive inquiries through our secure messaging system. Chat with interested users in real time.' },
  { title: 'Complete the Transaction',  desc: 'Finalize the deal directly with the buyer and grow your reputation through reviews.' },
];

export default function About() {
  return (
    <>
      <style>{`
        /* ── Page header ── */
        .about-page-header {
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
          padding: 3rem 0 2.5rem;
        }
        .about-page-header h1 {
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 900;
          color: #0a0f0d;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .about-page-header p {
          color: #6b7280;
          font-size: 1.05rem;
          max-width: 560px;
          line-height: 1.75;
        }
        .about-breadcrumb {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #059669;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 0.75rem;
        }

        /* ── Stats bar ── */
        .stats-bar {
          background: #059669;
          padding: 2rem 0;
        }
        .stat-item { text-align: center; color: #fff; }
        .stat-value {
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .stat-label {
          font-size: 0.82rem;
          opacity: 0.85;
          margin-top: 4px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        /* ── Steps ── */
        .step-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 2rem 1.5rem;
          text-align: center;
          transition: all 0.25s ease;
          height: 100%;
        }
        .step-card:hover {
          border-color: #059669;
          box-shadow: 0 8px 28px rgba(5,150,105,0.13);
          transform: translateY(-4px);
        }
        .step-num {
          display: inline-block;
          background: #ecfdf5;
          color: #059669;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          padding: 4px 12px;
          border-radius: 50px;
          margin-bottom: 1rem;
        }
        .step-icon { font-size: 2.2rem; margin-bottom: 0.75rem; }

        /* ── Values grid ── */
        .value-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 1.75rem 1.5rem;
          transition: all 0.25s ease;
          height: 100%;
        }
        .value-card:hover {
          border-color: #059669;
          box-shadow: 0 6px 20px rgba(5,150,105,0.1);
          transform: translateY(-3px);
        }
        .value-icon {
          font-size: 2rem;
          margin-bottom: 0.75rem;
          display: block;
        }

        /* ── For Users / Brokers ── */
        .role-step {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.75rem;
        }
        .role-step-num {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #ecfdf5;
          color: #059669;
          font-weight: 800;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }

        /* ── CTA ── */
        .about-cta {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          border-radius: 20px;
          padding: 3.5rem 2rem;
          text-align: center;
          color: #fff;
        }

        /* ── Section label ── */
        .section-eyebrow {
          display: inline-block;
          background: #ecfdf5;
          color: #059669;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 5px 14px;
          border-radius: 50px;
          margin-bottom: 1rem;
        }
      `}</style>

      {/* ── PAGE HEADER ── */}
      <div className="about-page-header">
        <div className="container">
          <div className="about-breadcrumb">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
            About EthioGebiya
          </div>
          <h1>Ethiopia's #1 Online Marketplace</h1>
          <p>
            Connecting buyers, sellers, brokers and companies across every region of Ethiopia —
            fast, safe, and free to start.
          </p>
          <div className="d-flex gap-3 flex-wrap mt-3">
            <Link to="/register" className="btn btn-success rounded-pill px-4 fw-bold">
              Get Started Free
            </Link>
            <Link to="/search" className="btn btn-outline-secondary rounded-pill px-4 fw-semibold">
              Browse Listings
            </Link>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        <div className="container">
          <div className="row g-3 justify-content-center">
            {STATS.map((s) => (
              <div key={s.label} className="col-6 col-md-3">
                <div className="stat-item">
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MISSION ── */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <span className="section-eyebrow">Our Mission</span>
              <h2 className="fw-bolder mb-3" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', lineHeight: 1.2 }}>
                Making commerce simple for every Ethiopian
              </h2>
              <p className="text-muted mb-3" style={{ lineHeight: 1.8 }}>
                EthioGebiya was built to solve a real problem — finding trusted buyers and sellers in Ethiopia was slow, fragmented, and risky. We created a single platform where anyone can list, discover, and transact with confidence.
              </p>
              <p className="text-muted mb-4" style={{ lineHeight: 1.8 }}>
                From Addis Ababa to Hawassa, from real estate to agriculture, we cover every category and every region so that opportunity is never more than a search away.
              </p>
              <div className="d-flex gap-3 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <span style={{ color: '#059669', fontSize: '1.2rem' }}>✓</span>
                  <span className="fw-semibold small">Phone-verified accounts</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ color: '#059669', fontSize: '1.2rem' }}>✓</span>
                  <span className="fw-semibold small">Moderated listings</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ color: '#059669', fontSize: '1.2rem' }}>✓</span>
                  <span className="fw-semibold small">Secure messaging</span>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div
                className="rounded-4 overflow-hidden shadow-lg"
                style={{ height: 340, background: `url(${heroBg}) center/cover no-repeat`, position: 'relative' }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,90,50,0.35)', borderRadius: 'inherit' }} />
                <div className="position-absolute bottom-0 start-0 p-4 text-white">
                  <div className="fw-bold" style={{ fontSize: '1.1rem' }}>Trusted by 120,000+ Ethiopians</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>Across all 11 regions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-5" style={{ background: '#f8fafc' }}>
        <div className="container">
          <div className="text-center mb-5">
            <span className="section-eyebrow">Simple Process</span>
            <h2 className="fw-bolder mb-2" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>How It Works</h2>
            <p className="text-muted" style={{ maxWidth: 480, margin: '0 auto' }}>Get started in just four easy steps</p>
          </div>
          <div className="row g-4">
            {STEPS.map((step) => (
              <div key={step.num} className="col-sm-6 col-lg-3">
                <div className="step-card">
                  <div className="step-num">{step.num}</div>
                  <div className="step-icon">{step.icon}</div>
                  <h5 className="fw-bold mb-2">{step.title}</h5>
                  <p className="text-muted small mb-0" style={{ lineHeight: 1.7 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR USERS & BROKERS ── */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <span className="section-eyebrow">Detailed Guide</span>
            <h2 className="fw-bolder mb-2" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>Step-by-Step Walkthrough</h2>
          </div>
          <div className="row g-5">
            {/* For Users */}
            <div className="col-lg-6">
              <div className="p-4 rounded-4 h-100" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <span style={{ fontSize: '1.5rem' }}>👤</span>
                  <h3 className="fw-bold mb-0" style={{ color: '#065f46' }}>For Buyers & Users</h3>
                </div>
                {USER_STEPS.map((s, i) => (
                  <div key={i} className="role-step">
                    <div className="role-step-num">{i + 1}</div>
                    <div>
                      <div className="fw-semibold mb-1">{s.title}</div>
                      <p className="text-muted small mb-0" style={{ lineHeight: 1.7 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* For Brokers */}
            <div className="col-lg-6">
              <div className="p-4 rounded-4 h-100" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <div className="d-flex align-items-center gap-2 mb-4">
                  <span style={{ fontSize: '1.5rem' }}>💼</span>
                  <h3 className="fw-bold mb-0" style={{ color: '#92400e' }}>For Brokers & Sellers</h3>
                </div>
                {BROKER_STEPS.map((s, i) => (
                  <div key={i} className="role-step">
                    <div className="role-step-num" style={{ background: '#fef3c7', color: '#b45309' }}>{i + 1}</div>
                    <div>
                      <div className="fw-semibold mb-1">{s.title}</div>
                      <p className="text-muted small mb-0" style={{ lineHeight: 1.7 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY ETHIOGEBIYA ── */}
      <section className="py-5" style={{ background: '#f8fafc' }}>
        <div className="container">
          <div className="text-center mb-5">
            <span className="section-eyebrow">Why Choose Us</span>
            <h2 className="fw-bolder mb-2" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)' }}>Built for Ethiopia</h2>
            <p className="text-muted" style={{ maxWidth: 480, margin: '0 auto' }}>
              Everything we build is designed around the needs of Ethiopian buyers, sellers, and businesses.
            </p>
          </div>
          <div className="row g-4">
            {VALUES.map((v) => (
              <div key={v.title} className="col-sm-6 col-lg-4">
                <div className="value-card">
                  <span className="value-icon">{v.icon}</span>
                  <h5 className="fw-bold mb-2">{v.title}</h5>
                  <p className="text-muted small mb-0" style={{ lineHeight: 1.7 }}>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="about-cta">
            <span
              className="badge rounded-pill px-3 py-2 fw-semibold mb-3 d-inline-block"
              style={{ background: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', letterSpacing: '0.06em' }}
            >
              🚀 &nbsp;Ready to get started?
            </span>
            <h2 className="fw-bolder mb-3" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}>
              Join thousands of Ethiopians on EthioGebiya
            </h2>
            <p className="mb-4 mx-auto" style={{ opacity: 0.85, maxWidth: 480, fontSize: '1.05rem' }}>
              Create your free account today and start buying, selling, or growing your business across Ethiopia.
            </p>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <Link to="/register" className="btn btn-warning btn-lg fw-bold rounded-pill px-5 shadow">
                Create Free Account →
              </Link>
              <Link to="/search" className="btn btn-outline-light btn-lg rounded-pill px-5 fw-semibold">
                Browse Listings
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
