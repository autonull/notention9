import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  label?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  id,
  ariaLabel,
  label
}: ToggleProps) {
  return (
  <div className="flex items-center gap-3">
    <button
        id={id}
        onClick={onChange}
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-checked={checked}
        role="switch"
        type="button"
        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 ${
        disabled
            ? 'bg-gray-700 cursor-not-allowed'
            : checked
            ? 'bg-blue-600'
            : 'bg-gray-600'
        }`}
    >
        <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200 ${
            checked && !disabled ? 'translate-x-5' : 'translate-x-0'
        }`}
        />
    </button>
    {label && (
        <span
            className={`text-sm font-medium ${disabled ? 'text-gray-500' : 'text-gray-300'} cursor-pointer`}
            onClick={!disabled ? onChange : undefined}
        >
            {label}
        </span>
    )}
  </div>
  );
}
