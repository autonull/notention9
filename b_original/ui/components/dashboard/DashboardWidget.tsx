import React from 'react';
import { Card, CardProps } from '../common/Card';
import { EmptyState, EmptyStateProps } from '../common/EmptyState';
import { IconButton } from '../common/IconButton';
import { ArrowPathIcon } from '../common/icons';

export interface DashboardWidgetProps extends CardProps {
  isEmpty?: boolean;
  emptyState?: Omit<EmptyStateProps, 'className'> & { className?: string };
  onRefresh?: () => void;
  subHeader?: React.ReactNode;
}

export function DashboardWidget({
  isEmpty,
  emptyState,
  onRefresh,
  headerAction,
  subHeader,
  children,
  ...cardProps
}: DashboardWidgetProps) {
  const combinedHeaderAction = (
      <div className="flex items-center gap-1">
          {onRefresh && (
              <IconButton
                  onClick={onRefresh}
                  icon={ArrowPathIcon}
                  size="sm"
                  variant="ghost"
                  title="Refresh"
              />
          )}
          {headerAction}
      </div>
  );

  return (
    <Card {...cardProps} headerAction={combinedHeaderAction}>
      {subHeader}
      {isEmpty && emptyState ? (
        <EmptyState
          {...emptyState}
          className={`py-6 ${emptyState.className || ''}`}
        />
      ) : (
        children
      )}
    </Card>
  );
};
