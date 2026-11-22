import React from 'react';
import {useSettings} from '../../hooks/useSettingsContext';
import {useI18n} from '../../hooks/useI18n';
import {LanguageSelector} from '../i18n/LanguageSelector';
import {GlobeIcon} from '../ui/icons';

export function LanguageTab() {
    const {settings, setSettings} = useSettings();
    const {t, supportedLanguages, language, direction} = useI18n();

    const directionLabel = direction === 'rtl' ? t('settings.rtl') : t('settings.ltr');

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-[13px] font-semibold text-[var(--app-text)] mb-2">{t('settings.languageRegion')}</h3>
                <p className="text-[var(--app-muted)] text-sm mb-4">
                    {t('settings.language')}: Choose your preferred language. The interface will update immediately.
                </p>
                <div className="flex items-center justify-between p-4 bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)]/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--app-raised)] rounded-lg text-blue-400">
                            <GlobeIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[var(--app-text)] font-medium">{t('common.language')}</p>
                            <p className="text-[var(--app-muted)] text-sm">
                                {supportedLanguages.find(l => l.code === language)?.nativeName || language}
                            </p>
                        </div>
                    </div>
                    <LanguageSelector variant="dropdown" showNativeName={true} />
                </div>
            </div>

            <div>
                <h3 className="text-[13px] font-semibold text-[var(--app-text)] mb-2">{t('settings.textDirection')}</h3>
                <p className="text-[var(--app-muted)] text-sm mb-4">
                    {t('settings.currentDirection')}: <strong className="text-[var(--app-text)]">{directionLabel}</strong>.
                    {t('settings.autoDetermined')}
                </p>
                <div className="p-4 bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)]/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="p-3 bg-[var(--app-raised)] rounded-lg">
                            <p className="text-[var(--app-muted)]">{t('common.language')}</p>
                            <p className="text-[var(--app-text)] font-medium">{language}</p>
                        </div>
                        <div className="p-3 bg-[var(--app-raised)] rounded-lg">
                            <p className="text-[var(--app-muted)]">{t('settings.textDirection')}</p>
                            <p className="text-[var(--app-text)] font-medium">{direction.toUpperCase()}</p>
                        </div>
                        <div className="p-3 bg-[var(--app-raised)] rounded-lg">
                            <p className="text-[var(--app-muted)]">RTL</p>
                            <p className="text-[var(--app-text)] font-medium">{direction === 'rtl' ? t('common.yes') : t('common.no')}</p>
                        </div>
                        <div className="p-3 bg-[var(--app-raised)] rounded-lg">
                            <p className="text-[var(--app-muted)]">Native Name</p>
                            <p className="text-[var(--app-text)] font-medium">
                                {supportedLanguages.find(l => l.code === language)?.nativeName || language}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-[13px] font-semibold text-[var(--app-text)] mb-2">{t('settings.availableLanguages')}</h3>
                <p className="text-[var(--app-muted)] text-sm mb-4">
                    {t('settings.supportedLanguagesCount', {count: supportedLanguages.length})}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {supportedLanguages.map((lang) => (
                        <div
                            key={lang.code}
                            className={`p-3 rounded-lg border transition-all ${
                                language === lang.code
                                    ? 'bg-blue-900/30 border-blue-500/50'
                                    : 'bg-[var(--app-raised)] border-[var(--app-line)]/50 hover:border-[var(--app-line-strong)]'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-[var(--app-text)]">{lang.nativeName}</span>
                                {lang.rtl && (
                                    <span className="text-xs px-2 py-0.5 bg-yellow-900/30 text-yellow-400 rounded">
                                        RTL
                                    </span>
                                )}
                            </div>
                            {lang.name !== lang.nativeName && (
                                <span className="text-xs text-[var(--app-muted)]">{lang.name}</span>
                            )}
                            <span className="text-xs text-[var(--app-muted)]">({lang.code})</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}