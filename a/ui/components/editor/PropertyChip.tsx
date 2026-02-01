import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { TagIcon } from '../common/icons';
import { ICON_MAP } from '../layout/iconMap';

export const PropertyChip = (props: NodeViewProps) => {
  const { node } = props;
  const { name, operator, value, icon } = node.attrs;

  const IconComponent = icon && ICON_MAP[icon] ? ICON_MAP[icon] : TagIcon;

  return (
    <NodeViewWrapper
      as="span"
      className="node-property inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 bg-blue-900/30 border border-blue-700/50 rounded-md select-none cursor-pointer hover:bg-blue-900/50 hover:border-blue-600 transition-colors text-sm text-blue-100"
      title="Click to edit"
    >
      <IconComponent className="w-3.5 h-3.5 text-blue-400" />
      <span className="font-semibold text-blue-300">{name}</span>
      <span className="text-blue-500 text-xs uppercase font-bold">{operator}</span>
      <span className="font-mono bg-blue-900/50 px-1 rounded text-blue-200">{value}</span>
    </NodeViewWrapper>
  );
};
