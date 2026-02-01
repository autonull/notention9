import React, { useState } from 'react';
import type { OntologyNode } from '@notention/core';
import { ChevronDownIcon, PlusIcon, TrashIcon } from '../common/icons';
import { AttributeList } from './AttributeList';
import { IconButton } from '../common/IconButton';

interface OntologyNodeProps {
  node: OntologyNode;
  level: number;
  usageStats?: Map<string, number>;
  isEditing?: boolean;
  onAddChild?: (parentId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
}

export function OntologyNodeItem({
    node,
    level,
    usageStats,
    isEditing,
    onAddChild,
    onDeleteNode
}: OntologyNodeProps) {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-expand first few levels
  const hasChildren = node.children && node.children.length > 0;

  // Calculate total usage for this node (tag usage)
  const tagCount = usageStats?.get(node.id) || usageStats?.get(node.label.toLowerCase()) || 0;

  return (
    <div style={{ paddingLeft: `${level * 1.5}rem` }}>
      <div
        className="flex items-center py-2 cursor-pointer group"
      >
        <div className="flex items-center flex-1" onClick={() => hasChildren && setIsOpen(!isOpen)}>
            {hasChildren ? (
            <ChevronDownIcon
                className={`h-5 w-5 mr-2 text-gray-500 transition-transform transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
            />
            ) : (
            <div className="w-5 h-5 mr-2" /> // Placeholder for alignment
            )}
            <span className="font-semibold text-blue-400">#{node.label}</span>

            {tagCount > 0 && (
                <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded-full" title="Usage count">
                    {tagCount}
                </span>
            )}

            {node.description && (
            <span className="ml-4 text-sm text-gray-400 hidden md:inline group-hover:inline">
                - {node.description}
            </span>
            )}
        </div>

        {isEditing && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                {onAddChild && (
                    <IconButton
                        icon={PlusIcon}
                        onClick={() => onAddChild(node.id)}
                        title="Add Child Node"
                        size="xs"
                        variant="ghost"
                        className="text-green-400"
                    />
                )}
                {onDeleteNode && (
                    <IconButton
                        icon={TrashIcon}
                        onClick={() => onDeleteNode(node.id)}
                        title="Delete Node"
                        size="xs"
                        variant="danger"
                    />
                )}
            </div>
        )}
      </div>

      {isOpen && node.attributes && Object.keys(node.attributes).length > 0 && (
          <AttributeList attributes={node.attributes} usageStats={usageStats} />
      )}

      {isOpen && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <OntologyNodeItem
                key={child.id}
                node={child}
                level={level + 1}
                usageStats={usageStats}
                isEditing={isEditing}
                onAddChild={onAddChild}
                onDeleteNode={onDeleteNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};
