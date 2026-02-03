import React from 'react';
import type { OntologyAttribute } from '@notention/core';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { MapIcon } from '../common/icons';

interface PropertyValueInputProps {
  value: string;
  onChange: (value: string) => void;
  attributeDef?: OntologyAttribute;
  onPickLocation?: () => Promise<string> | void;
}

export function PropertyValueInput({
  value,
  onChange,
  attributeDef,
  onPickLocation
}: PropertyValueInputProps) {
  if (attributeDef?.type === 'enum' && attributeDef.options) {
    return (
      <select
        className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={!!attributeDef}
      >
        <option value="">Select an option...</option>
        {attributeDef.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (attributeDef?.type === 'date') {
    return (
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={!!attributeDef}
      />
    );
  }

  if (attributeDef?.type === 'number') {
    return (
      <Input
        type="number"
        placeholder="e.g. 100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={!!attributeDef}
      />
    );
  }

  if (attributeDef?.type === 'datetime') {
    return (
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={!!attributeDef}
      />
    );
  }

  if (attributeDef?.type === 'boolean') {
    return (
      <select
        className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={!!attributeDef}
      >
        <option value="">Select...</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }

  if (attributeDef?.type === 'geo') {
    return (
      <div className="flex gap-2">
        <Input
          type="text"
          className="flex-1"
          placeholder="lat,lng"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={!!attributeDef}
        />
        {onPickLocation && (
          <Button
            type="button"
            onClick={async () => {
              // Handle both Promise and void returns
              const result = onPickLocation();
              if (result instanceof Promise) {
                  const loc = await result;
                  if (loc) onChange(loc);
              }
            }}
            variant="secondary"
            icon={MapIcon}
            title="Pick from Map"
          />
        )}
      </div>
    );
  }

  return (
    <Input
      type="text"
      placeholder={
        attributeDef?.description
          ? `e.g. for ${attributeDef.description}`
          : 'e.g. Active, 100, 2024-01-01'
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={!!attributeDef}
    />
  );
};
