import React, { useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from '../../i18n';

interface I18nProviderProps {
    children: React.ReactNode;
}

function I18nInitializer() {
    const { i18n: i18nInstance } = useTranslation();
    useEffect(() => {
        const initialLang = i18nInstance.language || 'en';
        document.documentElement.lang = initialLang;
        document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';
    }, [i18nInstance.language]);
    return null;
}

export function I18nProvider({ children }: I18nProviderProps) {
    return (
        <I18nextProvider i18n={i18n}>
            <I18nInitializer />
            {children}
        </I18nextProvider>
    );
}