import React, { forwardRef } from 'react';
import { UI_STYLES } from '../../utils/ui';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className = '', id, ...props }, ref) => {
  const inputId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className={UI_STYLES.input.label}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={`
            ${UI_STYLES.input.base}
            ${UI_STYLES.input.padding}
            custom-scrollbar
            ${error ? UI_STYLES.input.error : ''}
        `}
        {...props}
      />
      {error && (
        <p className={UI_STYLES.input.errorText}>{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
