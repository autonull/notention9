import React from 'react';
import { TagInput } from '../components/editor/TagInput';
import { createBaseStrategy } from '@notention/core/ui';
import { getStrategyConfig } from './strategyConfigs.js';

const config = getStrategyConfig('tag-input');
if (!config) throw new Error('Strategy config not found: tag-input');

export const TagInputStrategy = createBaseStrategy<
    React.ComponentProps<typeof TagInput>
>(
    config.id,
    config.seam,
    TagInput,
    config.version,
    config.defaultProps
);