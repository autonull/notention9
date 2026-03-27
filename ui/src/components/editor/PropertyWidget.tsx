import React, { useState } from 'react';
import type { Property } from '@notention/core';
import { TrashIcon, PencilIcon, CheckIcon, XIcon } from '../common/icons';
import { IconButton } from '../common/IconButton';

export interface PropertyWidgetProps {
  property: Property;
  onChange: (updated: Property) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

export function PropertyWidget({ property, onChange, onRemove, readOnly = false }: PropertyWidgetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(property.values.join(', '));
  const [editOp, setEditOp] = useState(property.operator);

  const handleSave = () => {
    onChange({
      ...property,
      operator: editOp,
      values: editValue.split(',').map(v => v.trim()).filter(v => v)
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(property.values.join(', '));
    setEditOp(property.operator);
    setIsEditing(false);
  };

  if (isEditing && !readOnly) {
    return (
      <div className="flex items-center gap-2 bg-gray-800 p-2 rounded border border-blue-500/50 animate-fade-in">
        <span className="text-blue-300 font-mono text-xs font-bold">{property.key}</span>

        <select
          value={editOp}
          onChange={(e) => setEditOp(e.target.value)}
          className="bg-gray-900 text-gray-300 text-xs rounded border border-gray-700 px-1 py-0.5 focus:border-blue-500 outline-none"
        >
          <option value="is">is</option>
          <option value="contains">contains</option>
          <option value="greater than">&gt;</option>
          <option value="less than">&lt;</option>
        </select>

        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="bg-gray-900 text-white text-xs rounded border border-gray-700 px-2 py-0.5 flex-1 min-w-[80px] focus:border-blue-500 outline-none"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />

        <div className="flex gap-1">
          <IconButton onClick={handleSave} icon={CheckIcon} variant="success" size="xs" />
          <IconButton onClick={handleCancel} icon={XIcon} variant="ghost" size="xs" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-gray-800/40 p-2 rounded border border-gray-700/50 hover:border-gray-600 group transition-all">
      <span className="text-blue-400 font-mono text-xs font-bold">{property.key}</span>

      <span className="text-gray-500 text-xs font-mono bg-gray-900/50 px-1.5 rounded">
        {property.operator === 'is' ? '=' : propToSymbol(property.operator)}
      </span>

      <span className="text-gray-300 text-sm truncate flex-1" title={property.values.join(', ')}>
        {property.values.join(', ')}
      </span>

      {!readOnly && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton
            onClick={() => setIsEditing(true)}
            icon={PencilIcon}
            variant="ghost"
            size="xs"
            className="hover:text-yellow-400"
          />
          <IconButton
            onClick={onRemove}
            icon={TrashIcon}
            variant="ghost"
            size="xs"
            className="hover:text-red-400"
          />
        </div>
      )}
    </div>
  );
}

function propToSymbol(op: string): string {
  switch(op) {
    case 'greater than': return '>';
    case 'less than': return '<';
    case 'contains': return '⊇';
    default: return op;
  }
}
