import React, { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  dividerAfter?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  closeOnSelect?: boolean;
}

export const Dropdown = ({ trigger, items, align = 'right', closeOnSelect = true }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      const enabledItems = items.filter((item) => !item.disabled);
      const focusedIndex = enabledItems.findIndex((item) =>
        document.activeElement === document.getElementById(`dropdown-item-${item.label}`)
      );
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex = Math.min(focusedIndex + 1, enabledItems.length - 1);
          document.getElementById(`dropdown-item-${enabledItems[nextIndex].label}`)?.focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = Math.max(focusedIndex - 1, 0);
          document.getElementById(`dropdown-item-${enabledItems[prevIndex].label}`)?.focus();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0) {
            enabledItems[focusedIndex].onClick();
            if (closeOnSelect) setIsOpen(false);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    },
    [isOpen, items, closeOnSelect]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </button>
      {isOpen && (
        <Card
          variant="elevated"
          padding="none"
          className={cn(
            DesignTokens.dropdown.container,
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="menu"
        >
          <div className="py-1">
            {items.map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && items[index - 1].dividerAfter && (
                  <div className={DesignTokens.dropdown.divider} role="separator" />
                )}
                <button
                  id={`dropdown-item-${item.label}`}
                  onClick={() => {
                    item.onClick();
                    if (closeOnSelect) setIsOpen(false);
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={item.disabled}
                  className={cn(
                    DesignTokens.dropdown.item,
                    item.danger ? DesignTokens.dropdown.itemDanger : DesignTokens.dropdown.itemDefault,
                    item.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  role="menuitem"
                  tabIndex={-1}
                  aria-disabled={item.disabled}
                >
                  {item.icon && <span className="flex-shrink-0 size-5">{item.icon}</span>}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-700 text-gray-500 rounded uppercase tracking-wider">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              </React.Fragment>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export interface DropdownTriggerProps {
  children: ReactNode;
  'aria-label'?: string;
}

export const DropdownTrigger = ({ children, 'aria-label': ariaLabel, ...props }: DropdownTriggerProps & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <Button variant="ghost" size="sm" {...props} aria-label={ariaLabel}>
    {children}
  </Button>
);