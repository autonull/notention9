import React from 'react';
import { PropertyForm } from '../components/editor/PropertyForm';
import { createBaseStrategy } from '@notention/core/ui';
import { getStrategyConfig } from './strategyConfigs.js';

const config = getStrategyConfig('property-form');
if (!config) throw new Error('Strategy config not found: property-form');

export const PropertyFormStrategy = createBaseStrategy<
    React.ComponentProps<typeof PropertyForm>
>(
    config.id,
    config.seam,
    PropertyForm,
    config.version,
    config.defaultProps
);