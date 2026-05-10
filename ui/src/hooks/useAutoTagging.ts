import {useCallback, useMemo, useState} from 'react';
import {isGeminiApiKeyAvailable, RemoteAIProvider} from '../services/ai/RemoteProvider';
import {LocalAIProvider} from '../services/ai/LocalProvider';
import {getTextFromHtml} from '../utils/html';
import {useSettings} from './useSettingsContext';
import type {AIProvider} from '../services/ai/types';

interface UseAutoTaggingProps {
    content: string;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
}

export function useAutoTagging({content, tags, onTagsChange}: UseAutoTaggingProps) {
    const {settings} = useSettings();
    const [isAutoTagging, setIsAutoTagging] = useState(false);

    const provider: AIProvider = useMemo(() => {
        if (settings.aiEnabled && isGeminiApiKeyAvailable(settings.googleGeminiApiKey)) {
            return new RemoteAIProvider(settings.googleGeminiApiKey);
        }
        return new LocalAIProvider();
    }, [settings.aiEnabled, settings.googleGeminiApiKey]);

    const handleAutoTag = useCallback(async () => {
        if (!content) return;

        setIsAutoTagging(true);
        try {
            const text = getTextFromHtml(content);
            const suggestions = await provider.suggestTags(text);
            const uniqueTags = Array.from(
                new Set([...tags, ...suggestions])
            );
            onTagsChange(uniqueTags);
        } finally {
            setIsAutoTagging(false);
        }
    }, [content, tags, onTagsChange, provider]);

    return {
        isAutoTagging,
        handleAutoTag,
        isApiKeyAvailable: true // Always true now since we have Local fallback
    };
};
