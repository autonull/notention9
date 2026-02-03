import React from 'react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
  iconClassName = 'h-8 w-8 text-gray-500'
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {Icon && (
        <div className="bg-gray-800 p-4 rounded-full mb-4">
          <Icon className={iconClassName} />
        </div>
      )}
      <h3 className="text-gray-300 mb-2 font-medium text-lg">{title}</h3>
      {description && (
        <div className="text-gray-500 text-sm mb-6 max-w-xs">
          {description}
        </div>
      )}
      {action}
    </div>
  );
};
