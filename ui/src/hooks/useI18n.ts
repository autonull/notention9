import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { useCallback, useMemo } from 'react';
import i18n, { SupportedLanguage, SUPPORTED_LANGUAGES, setLanguage, getCurrentLanguage, getDirection, DEFAULT_LANGUAGE } from '../i18n';

export interface UseI18nReturn {
    t: ReturnType<typeof useI18nextTranslation>['t'];
    i18n: ReturnType<typeof useI18nextTranslation>['i18n'];
    ready: boolean;
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => void;
    supportedLanguages: typeof SUPPORTED_LANGUAGES;
    direction: 'ltr' | 'rtl';
    isRTL: boolean;
}

export function useI18n(namespace?: string | string[]): UseI18nReturn {
    const { t, i18n, ready } = useI18nextTranslation(namespace);

    const language = useMemo(() => getCurrentLanguage(), [i18n.language]);
    const direction = useMemo(() => getDirection(language), [language]);
    const isRTL = direction === 'rtl';

    const handleSetLanguage = useCallback((lang: SupportedLanguage) => {
        setLanguage(lang);
    }, []);

    return {
        t,
        i18n,
        ready,
        language,
        setLanguage: handleSetLanguage,
        supportedLanguages: SUPPORTED_LANGUAGES,
        direction,
        isRTL,
    };
}

export function useLanguage(): SupportedLanguage {
    return getCurrentLanguage();
}

export function useDirection(): 'ltr' | 'rtl' {
    const lang = getCurrentLanguage();
    return getDirection(lang);
}

export function useIsRTL(): boolean {
    return useDirection() === 'rtl';
}

export { SupportedLanguage, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, setLanguage, getCurrentLanguage, getDirection };
export default i18n;