import { useHelp } from '@/hooks/useHelp';
import { EmptyState } from './EmptyState';
import { Button } from './Button';
import { SparklesIcon, ArrowRightIcon, HelpIcon } from './icons';
import { cn } from '../../utils/ui';
import { EMPTY_STATE_CONFIGS, type ActionableEmptyStateProps } from './ActionableEmptyStateProps';

export function ActionableEmptyState(props: ActionableEmptyStateProps) {
  const { variant, className, testId = `empty-state-${variant}` } = props;
  const config = EMPTY_STATE_CONFIGS[variant];
  const help = useHelp();

  if (!config) {
    return null;
  }

  const primaryAction = (
    <Button
      variant="primary"
      size="lg"
      leftIcon={<SparklesIcon className="w-4 h-4" />}
      className={cn('touch-target-48', config.secondaryAction && 'mr-2')}
      onClick={config.primaryAction}
      data-testid={`${testId}-primary-cta`}
    >
      {config.primaryLabel}
    </Button>
  );

  const secondaryAction = config.secondaryAction && config.secondaryLabel ? (
    <Button
      variant="ghost"
      size="md"
      leftIcon={<ArrowRightIcon className="w-4 h-4" />}
      className="touch-target-48"
      onClick={config.secondaryAction}
      data-testid={`${testId}-secondary-cta`}
    >
      {config.secondaryLabel}
    </Button>
  ) : null;

  const helpLink = config.helpTopicId ? (
    <Button
      variant="ghost"
      size="sm"
      leftIcon={<HelpIcon className="w-4 h-4" />}
      className="touch-target-48 mt-2"
      onClick={() => help.setCurrentTopic(config.helpTopicId!)}
      data-testid={`${testId}-help-link`}
    >
      Learn more
    </Button>
  ) : null;

  return (
    <div className={cn('empty-state-actionable', className)} data-testid={testId}>
      <EmptyState
        variant="actionable"
        title={config.title}
        description={config.description}
        action={primaryAction}
        secondaryAction={secondaryAction}
      />
      {helpLink && (
        <div className="mt-4">
          {helpLink}
        </div>
      )}
    </div>
  );
}