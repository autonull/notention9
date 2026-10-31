import React from 'react';
import { DescribeItComposer } from '../components/editor/DescribeItComposer';
import { createBaseStrategy } from '@notention/core/ui';
import { getStrategyConfig } from './strategyConfigs.js';

const config = getStrategyConfig('describe-it-composer');
if (!config) throw new Error('Strategy config not found: describe-it-composer');

export const DescribeItComposerStrategy = createBaseStrategy<
    React.ComponentProps<typeof DescribeItComposer>
>(
    config.id,
    config.seam,
    DescribeItComposer,
    config.version,
    config.defaultProps
);