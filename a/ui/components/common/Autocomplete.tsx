import React, { useState, useEffect, useRef } from 'react';
import { Input } from './Input';

export interface AutocompleteOption {
  value: string;
  label?: string;
  description?: string;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | AutocompleteOption)[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function Autocomplete({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  autoFocus
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Normalize options
  const normalizedOptions: AutocompleteOption[] = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Filter options based on input
  const filteredOptions = normalizedOptions.filter(opt => {
    if (!value) return true;
    const v = opt.value.toLowerCase();
    const l = (opt.label || '').toLowerCase();
    const q = value.toLowerCase();
    return v.includes(q) || l.includes(q);
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [value, isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (isOpen && listRef.current && filteredOptions.length > 0) {
        const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
        if (selectedElement) {
             // specific logic to keep it in view if needed, but browser default often handles it
             // or we can use scrollIntoView if behavior is smooth
             // simple version:
             if (selectedElement.offsetTop < listRef.current.scrollTop) {
                 listRef.current.scrollTop = selectedElement.offsetTop;
             } else if (selectedElement.offsetTop + selectedElement.offsetHeight > listRef.current.scrollTop + listRef.current.offsetHeight) {
                 listRef.current.scrollTop = selectedElement.offsetTop + selectedElement.offsetHeight - listRef.current.offsetHeight;
             }
        }
    }
  }, [selectedIndex, isOpen, filteredOptions.length]);


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      setSelectedIndex(prev => (prev + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === 'Enter') {
      if (isOpen && filteredOptions.length > 0) {
        e.preventDefault();
        onChange(filteredOptions[selectedIndex].value);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <Input
        value={value}
        onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full"
      />

      {isOpen && filteredOptions.length > 0 && (
        <ul
            ref={listRef}
            className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto custom-scrollbar focus:outline-none"
        >
          {filteredOptions.map((opt, index) => (
            <li
              key={`${opt.value}-${index}`}
              className={`px-3 py-2 cursor-pointer flex flex-col ${
                index === selectedIndex ? 'bg-blue-600/30 text-white' : 'text-gray-300 hover:bg-gray-700/50'
              }`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{opt.label || opt.value}</span>
                  {opt.value !== opt.label && <span className="text-xs text-gray-500 ml-2 font-mono">{opt.value}</span>}
              </div>
              {opt.description && (
                <span className="text-xs text-gray-500 truncate mt-0.5">{opt.description}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
