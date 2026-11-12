import React, { useEffect, createElement } from 'react';
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
    return createElement(I18nextProvider as React.ComponentType<{ i18n: typeof i18n; children: React.ReactNode }>, { i18n, children },
        createElement(I18nInitializer)
    );
}