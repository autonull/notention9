import React from 'react';
import { useI18n } from '../../hooks/useI18n';
import { cn } from '../../utils/ui';

interface LanguageSelectorProps {
    className?: string;
    variant?: 'dropdown' | 'buttons';
    showNativeName?: boolean;
}

export function LanguageSelector({
    className = '',
    variant = 'dropdown',
    showNativeName = true,
}: LanguageSelectorProps) {
    const { language, setLanguage, supportedLanguages, t, direction } = useI18n();

    if (variant === 'buttons') {
        return (
            <div
                className={cn('flex items-center gap-1', className)}
                role="group"
                aria-label={t('common.language')}
            >
                {supportedLanguages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={cn(
                            'px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                            language === lang.code
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        )}
                        aria-pressed={language === lang.code}
                        aria-label={`${lang.nativeName} (${lang.name})`}
                    >
                        {showNativeName ? lang.nativeName : lang.name}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className={cn('relative inline-block', className)}>
            <button
                id="language-selector-trigger"
                onClick={() => {
                    const menu = document.getElementById('language-selector-menu');
                    if (menu) {
                        menu.hidden = !menu.hidden;
                    }
                }}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
                    'hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
                aria-haspopup="listbox"
                aria-expanded="false"
                aria-label={t('common.language')}
            >
                <span className="flex items-center gap-1">
                    {supportedLanguages.find(l => l.code === language)?.nativeName || language}
                </span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <div
                id="language-selector-menu"
                role="listbox"
                aria-label={t('common.language')}
                aria-orientation="vertical"
                className={cn(
                    'absolute right-0 mt-1 w-48 origin-top-right rounded-lg shadow-lg border',
                    'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                    'py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-150',
                    direction === 'rtl' ? 'left-0 right-auto' : 'right-0 left-auto'
                )}
                hidden
            >
                {supportedLanguages.map((lang) => (
                    <button
                        key={lang.code}
                        role="option"
                        aria-selected={language === lang.code}
                        onClick={() => {
                            setLanguage(lang.code);
                            const menu = document.getElementById('language-selector-menu');
                            if (menu) menu.hidden = true;
                        }}
                        className={cn(
                            'w-full px-3 py-2 text-sm text-left transition-colors',
                            'focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30',
                            language === lang.code
                                ? 'bg-blue-50 dark:bg-blue-900/30 font-medium text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <span>{lang.nativeName}</span>
                            {showNativeName && lang.name !== lang.nativeName && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                    {lang.name}
                                </span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}