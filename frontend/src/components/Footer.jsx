import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 py-3">

          {/* Brand */}
          <span className="footer-brand-sm">🏠 EthioGebiya</span>

          {/* Links */}
          <div className="d-flex flex-wrap gap-4 align-items-center">
            <Link to="/search?category=real-estate">{t('footer.realEstate')}</Link>
            <Link to="/search?category=automotive">{t('footer.automotive')}</Link>
            <Link to="/search">{t('footer.allListings')}</Link>
            <span className="footer-sep">|</span>
            <span>📧 {t('footer.support')}</span>
            <span>📞 {t('footer.phone')}</span>
          </div>

          {/* Copyright */}
          <span className="footer-copy">© {new Date().getFullYear()} EthioGebiya</span>
        </div>
      </div>
    </footer>
  );
}
