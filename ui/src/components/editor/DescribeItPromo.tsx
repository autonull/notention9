import { useDescribeItPromo } from '@/hooks/useDescribeItPromo';
import { Button } from '../ui/Button';
import { cn } from '../../utils/ui';
import { SparklesIcon, XIcon, ArrowRightIcon, InfoIcon } from '../ui/icons';
import type { DescribeItPromoProps } from './DescribeItPromoProps';

const variantStyles = {
  pulse: 'inline-promo inline-promo--pulse',
  tooltip: 'inline-promo inline-promo--tooltip',
  'contextual-hint': 'inline-promo inline-promo--contextual-hint',
};

const variantConfigs = {
  pulse: {
    message: 'Describe what you need in plain English',
    ctaText: 'Try Describe It',
    icon: SparklesIcon,
    dismissible: true,
  },
  tooltip: {
    message: 'Press Ctrl+Shift+/ to open Describe It',
    ctaText: 'Open Describe It',
    icon: InfoIcon,
    dismissible: true,
  },
  'contextual-hint': {
    message: 'Stuck? Describe what you need and let AI help',
    ctaText: 'Get help',
    icon: SparklesIcon,
    dismissible: false,
  },
};

export function DescribeItPromo(props: DescribeItPromoProps) {
  const { variant = 'pulse' } = props;
  const promo = useDescribeItPromo({ variant });
  
  if (!promo.shouldShow) return null;

  const config = variantConfigs[variant];
  const baseClass = variantStyles[variant];

  return (
    <div 
      className={cn(baseClass, `data-[variant=${variant}]`)}
      data-testid={`inline-promo-${variant}`}
      role="status"
      aria-live="polite"
    >
      {config.dismissible && (
        <button
          onClick={promo.onDismiss}
          className="promo-dismiss"
          aria-label="Dismiss"
          data-testid={`promo-dismiss-${variant}`}
        >
          <XIcon className="w-4 h-4" />
        </button>
      )}
      <span className="promo-content">
        <config.icon className="w-4 h-4 inline mr-2" aria-hidden="true" />
        {config.message}
      </span>
      <Button
        onClick={promo.onActivate}
        variant="primary"
        size="sm"
        rightIcon={<ArrowRightIcon className="w-4 h-4" />}
        className="promo-cta"
        data-testid={`promo-activate-${variant}`}
      >
        {config.ctaText}
      </Button>
    </div>
  );
}