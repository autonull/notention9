import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

export interface SuggestionItem {
  id: string; // The text to insert
  label: string; // The display text
  description?: string;
  type?: 'tag' | 'property' | 'template';
}

interface SuggestionListProps {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
}

export const SuggestionList = forwardRef((props: SuggestionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
      return null;
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[200px] z-50">
      {props.items.map((item, index) => (
        <button
          key={index}
          className={`block w-full text-left px-4 py-2 text-sm ${
            index === selectedIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => selectItem(index)}
        >
          <div className="font-medium">{item.label}</div>
          {item.description && (
            <div className={`text-xs ${index === selectedIndex ? 'text-blue-200' : 'text-gray-500'}`}>
              {item.description}
            </div>
          )}
        </button>
      ))}
    </div>
  );
});

SuggestionList.displayName = 'SuggestionList';
