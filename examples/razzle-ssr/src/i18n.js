import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import XHR from 'i18next-xhr-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

const options = {
  fallbackLng: 'en',
  lng: 'en',
  load: 'languageOnly', // we only provide en, de -> no region specific locals like en-US, de-DE
  // have a common namespace used around the full app
  ns: ['translations'],
  defaultNS: 'translations',

  saveMissing: true,
  debug: true,

  interpolation: {
    escapeValue: false, // not needed for react!!
    formatSeparator: ',',
    format: (value, format, lng) => {
      if (format === 'uppercase') return value.toUpperCase();
      return value;
    },
  },
  wait: process && !process.release,
};

// for browser use xhr backend to load translations and browser lng detector
if (process && !process.release) {
  i18n
    .use(XHR)
    .use(initReactI18next)
    .use(LanguageDetector);
}

// initialize if not already initialized
if (!i18n.isInitialized) {
  i18n.init(options);

  if (process.env.NODE_ENV !== 'production') {
    const { applyClientHMR } = require('i18next-hmr/client');
    applyClientHMR(i18n);
  }
}

export default i18n;
