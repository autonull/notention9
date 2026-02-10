import React, {forwardRef} from 'react';
import {UI_STYLES} from '../../utils/ui';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options?: SelectOption[];
    className?: string;
    leftIcon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
                                                                      label,
                                                                      error,
                                                                      options,
                                                                      children,
                                                                      className = '',
                                                                      leftIcon,
                                                                      ...props
                                                                  }, ref) => {
    return (
        <div className={className}>
            {label && (
                <label className={UI_STYLES.input.label}>
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {leftIcon}
                    </div>
                )}
                <select
                    ref={ref}
                    className={`
            ${UI_STYLES.input.base}
            py-2.5
            appearance-none
            ${leftIcon ? 'pl-10' : 'px-3'} pr-10
            ${error ? UI_STYLES.input.error : ''}
          `}
                    {...props}
                >
                    {options ? (
                        options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))
                    ) : (
                        children
                    )}
                </select>
                {/* Custom arrow icon */}
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                    </svg>
                </div>
            </div>
            {error && (
                <p className={UI_STYLES.input.errorText}>{error}</p>
            )}
        </div>
    );
});

Select.displayName = 'Select';
