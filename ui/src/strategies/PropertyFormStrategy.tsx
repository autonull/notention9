import React from 'react';
import { PropertyEditor } from '../components/editor/PropertyEditor';
import { createBaseStrategy } from '@notention/core/ui';
import { getStrategyConfig } from './strategyConfigs.js';

const config = getStrategyConfig('property-form');
if (!config) throw new Error('Strategy config not found: property-form');

export const PropertyFormStrategy = createBaseStrategy<
    React.ComponentProps<typeof PropertyEditor>
>(
    config.id,
    config.seam,
    PropertyEditor,
    config.version,
    config.defaultProps
);