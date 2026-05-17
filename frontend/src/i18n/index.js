import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './en.json';
import am from './am.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'am'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferredLanguage',
    },
  });

// Apply lang attribute to <html> on every language change
function applyLang(lng) {
  document.documentElement.lang = lng === 'am' ? 'am' : 'en';
}

// Apply on init
i18n.on('initialized', () => applyLang(i18n.language));

// Apply on every change
i18n.on('languageChanged', (lng) => applyLang(lng));

export default i18n;
