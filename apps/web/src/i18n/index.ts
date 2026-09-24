import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

// Every user-facing string lives in ./locales. Add a language by adding a file
// there and listing it in `resources`.
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React escapes already
  returnNull: false,
});

export default i18n;
