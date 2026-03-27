import React from 'react';
import type { SortOrder } from '@notention/core';
import { Select } from '../common/Select';

interface SortSelectorProps {
  sortOrder: SortOrder;
  onSortChange: (order: SortOrder) => void;
}

const SORT_OPTIONS = [
    { value: "updatedAt_desc", label: "Sort: Modified (Newest)" },
    { value: "updatedAt_asc", label: "Sort: Modified (Oldest)" },
    { value: "createdAt_desc", label: "Sort: Created (Newest)" },
    { value: "createdAt_asc", label: "Sort: Created (Oldest)" },
    { value: "title_asc", label: "Sort: Title (A-Z)" },
    { value: "title_desc", label: "Sort: Title (Z-A)" },
    { value: "soonest", label: "Sort: Soonest (Date)" },
    { value: "nearest", label: "Sort: Nearest (Location)" },
    { value: "tags", label: "Sort: Tags (Count)" },
];

export function SortSelector({
  sortOrder,
  onSortChange,
}: SortSelectorProps) {
  return (
    <Select
      value={sortOrder}
      onChange={(e) => onSortChange(e.target.value as SortOrder)}
      options={SORT_OPTIONS}
      className="w-full"
    />
  );
}
