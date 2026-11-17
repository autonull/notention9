import {useCallback, useMemo, useState} from 'react';
import {isGeminiApiKeyAvailable, RemoteAIProvider} from '../services/ai/RemoteProvider';
import {LocalAIProvider} from '../services/ai/LocalProvider';
import {getTextFromHtml} from '../utils/html';
import {useSettings} from './useSettingsContext';
import {useToast} from './useToast';
import type {AIProvider} from '../services/ai/types';

interface UseAutoTaggingProps {
    content: string;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
}

export function useAutoTagging({content, tags, onTagsChange}: UseAutoTaggingProps) {
    const {settings} = useSettings();
    const {addToast} = useToast();
    const [isAutoTagging, setIsAutoTagging] = useState(false);

    const provider: AIProvider = useMemo(() => {
        if (settings.aiEnabled && isGeminiApiKeyAvailable(settings.googleGeminiApiKey)) {
            return new RemoteAIProvider(settings.googleGeminiApiKey, settings.aiPiiRedactionEnabled ?? true, settings.aiPiiOverrideEnabled ?? false);
        }
        return new LocalAIProvider();
    }, [settings.aiEnabled, settings.googleGeminiApiKey, settings.aiPiiRedactionEnabled, settings.aiPiiOverrideEnabled]);

    const handleAutoTag = useCallback(async () => {
        if (!content) return;

        setIsAutoTagging(true);
        try {
            const text = getTextFromHtml(content);
            const suggestions = await provider.suggestTags(text);
            // Check for PII redaction after remote inference
            if (provider instanceof RemoteAIProvider && settings.aiPiiRedactionEnabled) {
                const redactionInfo = provider.getLastRedactionInfo();
                if (redactionInfo?.hasRedactions) {
                    const kinds = [...new Set(redactionInfo.matches.map(m => m.kind))].join(', ');
                    addToast(`PII redacted (${kinds}) before sending to remote AI`, 'info');
                }
            }
            const uniqueTags = Array.from(
                new Set([...tags, ...suggestions])
            );
            onTagsChange(uniqueTags);
        } finally {
            setIsAutoTagging(false);
        }
    }, [content, tags, onTagsChange, provider, settings.aiPiiRedactionEnabled, addToast]);

    return {
        isAutoTagging,
        handleAutoTag,
        isApiKeyAvailable: true // Always true now since we have Local fallback
    };
};
