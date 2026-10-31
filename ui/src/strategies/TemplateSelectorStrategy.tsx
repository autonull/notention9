import React from 'react';
import { TemplateSelector } from '../components/editor/TemplateSelector';
import { createBaseStrategy } from '@notention/core/ui';
import { getStrategyConfig } from './strategyConfigs.js';

const config = getStrategyConfig('template-selector');
if (!config) throw new Error('Strategy config not found: template-selector');

export const TemplateSelectorStrategy = createBaseStrategy<
    React.ComponentProps<typeof TemplateSelector>
>(
    config.id,
    config.seam,
    TemplateSelector,
    config.version,
    config.defaultProps
);