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
                <h3 className="text-lg font-semibold text-white mb-2">{t('settings.languageRegion')}</h3>
                <p className="text-neutral-400 text-sm mb-4">
                    {t('settings.language')}: Choose your preferred language. The interface will update immediately.
                </p>
                <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-700/50 rounded-lg text-blue-400">
                            <GlobeIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-white font-medium">{t('common.language')}</p>
                            <p className="text-neutral-400 text-sm">
                                {supportedLanguages.find(l => l.code === language)?.nativeName || language}
                            </p>
                        </div>
                    </div>
                    <LanguageSelector variant="dropdown" showNativeName={true} />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-2">{t('settings.textDirection')}</h3>
                <p className="text-neutral-400 text-sm mb-4">
                    {t('settings.currentDirection')}: <strong className="text-white">{directionLabel}</strong>.
                    {t('settings.autoDetermined')}
                </p>
                <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="p-3 bg-neutral-700/50 rounded-lg">
                            <p className="text-neutral-400">{t('common.language')}</p>
                            <p className="text-white font-medium">{language}</p>
                        </div>
                        <div className="p-3 bg-neutral-700/50 rounded-lg">
                            <p className="text-neutral-400">{t('settings.textDirection')}</p>
                            <p className="text-white font-medium">{direction.toUpperCase()}</p>
                        </div>
                        <div className="p-3 bg-neutral-700/50 rounded-lg">
                            <p className="text-neutral-400">RTL</p>
                            <p className="text-white font-medium">{direction === 'rtl' ? t('common.yes') : t('common.no')}</p>
                        </div>
                        <div className="p-3 bg-neutral-700/50 rounded-lg">
                            <p className="text-neutral-400">Native Name</p>
                            <p className="text-white font-medium">
                                {supportedLanguages.find(l => l.code === language)?.nativeName || language}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-2">{t('settings.availableLanguages')}</h3>
                <p className="text-neutral-400 text-sm mb-4">
                    {t('settings.supportedLanguagesCount', {count: supportedLanguages.length})}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {supportedLanguages.map((lang) => (
                        <div
                            key={lang.code}
                            className={`p-3 rounded-lg border transition-all ${
                                language === lang.code
                                    ? 'bg-blue-900/30 border-blue-500/50'
                                    : 'bg-neutral-800/50 border-neutral-700/50 hover:border-neutral-600'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-white">{lang.nativeName}</span>
                                {lang.rtl && (
                                    <span className="text-xs px-2 py-0.5 bg-yellow-900/30 text-yellow-400 rounded">
                                        RTL
                                    </span>
                                )}
                            </div>
                            {lang.name !== lang.nativeName && (
                                <span className="text-xs text-neutral-400">{lang.name}</span>
                            )}
                            <span className="text-xs text-neutral-400">({lang.code})</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}