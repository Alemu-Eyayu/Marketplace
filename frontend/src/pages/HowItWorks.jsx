import { Link } from 'react-router-dom';

const HOW_IT_WORKS = [
  { num: '01', icon: '📝', title: 'Create Free Account', desc: 'Sign up in 2 minutes and verify your phone number.' },
  { num: '02', icon: '🔍', title: 'Browse Listings', desc: 'Search properties, vehicles, jobs and more across Ethiopia.' },
  { num: '03', icon: '💬', title: 'Connect Securely', desc: 'Chat with brokers and companies through our platform.' },
  { num: '04', icon: '🤝', title: 'Close the Deal', desc: 'Agree on terms and complete your transaction directly with the seller.' },
];

export default function HowItWorks() {
  return (
    <div className="page-wrapper">
      {/* Hero Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <div className="section-label">Simple Process</div>
            <h1 className="section-title">How It Works</h1>
            <p className="section-subtitle">Get started in just a few steps</p>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-5" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="row g-4">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.num} className="col-md-3">
                <div className="step-card">
                  <div className="step-num">{step.num}</div>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>{step.icon}</div>
                  <h5>{step.title}</h5>
                  <p className="text-muted small">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Steps */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row g-5">
            <div className="col-lg-6">
              <h3 className="mb-4">For Users</h3>
              <div className="mb-4">
                <h5>1. Create Your Account</h5>
                <p className="text-muted">Sign up with your phone number and verify it with OTP. Complete your profile to build trust.</p>
              </div>
              <div className="mb-4">
                <h5>2. Browse Listings</h5>
                <p className="text-muted">Search through verified listings across Ethiopia. Filter by location, price, category, and more.</p>
              </div>
              <div className="mb-4">
                <h5>3. Contact Brokers</h5>
                <p className="text-muted">Message brokers directly through our platform. Ask questions and schedule viewings.</p>
              </div>
              <div className="mb-4">
                <h5>4. Close the Deal</h5>
                <p className="text-muted">Agree on terms with the seller and complete your transaction. Use our messaging system to coordinate the handover.</p>
              </div>
            </div>

            <div className="col-lg-6">
              <h3 className="mb-4">For Brokers</h3>
              <div className="mb-4">
                <h5>1. Register as Broker</h5>
                <p className="text-muted">Sign up with your business license and get verified. Build a trusted professional profile.</p>
              </div>
              <div className="mb-4">
                <h5>2. Post Your Listings</h5>
                <p className="text-muted">Add photos, videos, detailed descriptions, and set your price. Supports real estate, automotive, jobs, and more.</p>
              </div>
              <div className="mb-4">
                <h5>3. Connect with Users</h5>
                <p className="text-muted">Receive inquiries through our secure messaging system. Chat with interested users and answer their questions.</p>
              </div>
              <div className="mb-4">
                <h5>4. Complete the Transaction</h5>
                <p className="text-muted">Agree on terms and finalize the deal directly with the buyer through our platform.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-5" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="cta-section">
            <h2 style={{ color: 'white', fontWeight: 900, fontSize: '2rem', marginBottom: 12 }}>
              Ready to Get Started?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 32, fontSize: '1.05rem' }}>
              Join thousands of Ethiopians buying and selling on EthioGebiya
            </p>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <Link to="/register" className="btn btn-warning btn-lg fw-bold rounded-pill px-5">
                Create Free Account →
              </Link>
              <Link to="/search" className="btn btn-outline-light btn-lg rounded-pill px-5">
                Browse Listings
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}