import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import zh from './locales/zh.json';
import ar from './locales/ar.json';

const resources = {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    zh: { translation: zh },
    ar: { translation: ar },
} as const;

export type SupportedLanguage = keyof typeof resources;

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; name: string; nativeName: string; rtl?: boolean }[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

const isRTL = (lang: SupportedLanguage): boolean => {
    const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang);
    return langInfo?.rtl ?? false;
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
        debug: import.meta.env.DEV,
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'notention-language',
        },
        react: {
            useSuspense: false,
        },
    });

export const setLanguage = (lang: SupportedLanguage): void => {
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
};

export const getCurrentLanguage = (): SupportedLanguage => {
    return (i18n.language as SupportedLanguage) ?? DEFAULT_LANGUAGE;
};

export const getDirection = (lang?: SupportedLanguage): 'ltr' | 'rtl' => {
    return isRTL(lang ?? getCurrentLanguage()) ? 'rtl' : 'ltr';
};

export default i18n;