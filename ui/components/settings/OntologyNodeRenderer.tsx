import React from 'react';
import { OntologyNode } from '@notention/core';
import { FolderIcon, EditIcon, PlusIcon, TrashIcon, TagIcon, MergeIcon, SparklesIcon } from '../common/icons';
import { IconButton } from '../common/IconButton';

interface OntologyNodeRendererProps {
  node: OntologyNode;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
  onRenameNode: (id: string, currentLabel: string) => void;
  onAddNode: (parentId: string) => void;
  onDeleteNode: (id: string) => void;
  onAddAttribute: (nodeId: string) => void;
  onRenameAttribute: (nodeId: string, oldKey: string) => void;
  onMergeAttribute: (nodeId: string, sourceKey: string) => void;
  onDeleteAttribute: (nodeId: string, key: string) => void;
}

export function OntologyNodeRenderer({
  node,
  expandedNodes,
  toggleExpand,
  onRenameNode,
  onAddNode,
  onDeleteNode,
  onAddAttribute,
  onRenameAttribute,
  onMergeAttribute,
  onDeleteAttribute
}: OntologyNodeRendererProps) {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const hasAttributes = node.attributes && Object.keys(node.attributes).length > 0;

    // Highlight Emergent Node
    const isEmergent = node.id === 'emergent';

    return (
      <li key={node.id} className="ml-4 border-l border-gray-700 pl-4 py-2">
        <div className="flex items-center gap-2 group">
          <button
            onClick={() => toggleExpand(node.id)}
            className={`p-1 rounded hover:bg-gray-700 ${!hasChildren && !hasAttributes ? 'invisible' : ''}`}
          >
            {isExpanded ? '▼' : '▶'}
          </button>

          {isEmergent ? <SparklesIcon className="w-5 h-5 text-purple-400" /> : <FolderIcon className="w-5 h-5 text-blue-400" />}
          <span className={`font-medium ${isEmergent ? 'text-purple-300' : 'text-gray-200'}`}>{node.label}</span>
          <span className="text-xs text-gray-500 font-mono">({node.id})</span>

          <div className="hidden group-hover:flex gap-1 ml-4">
             <IconButton
                onClick={() => onRenameNode(node.id, node.label)}
                tooltip="Rename"
                icon={EditIcon}
                variant="ghost"
                size="xs"
                className="text-gray-400 hover:text-white"
             />
             <IconButton
                onClick={() => onAddNode(node.id)}
                tooltip="Add Child"
                icon={PlusIcon}
                variant="ghost"
                size="xs"
                className="text-green-400 hover:text-green-300"
             />
             <IconButton
                onClick={() => onDeleteNode(node.id)}
                tooltip="Delete"
                icon={TrashIcon}
                variant="ghost"
                size="xs"
                className="text-red-400 hover:text-red-300"
             />
             <IconButton
                onClick={() => onAddAttribute(node.id)}
                tooltip="Add Attribute"
                icon={TagIcon}
                variant="ghost"
                size="xs"
                className="text-yellow-400 hover:text-yellow-300"
             />
          </div>
        </div>

        {isExpanded && (
          <div className="mt-2">
            {/* Attributes */}
            {node.attributes && Object.entries(node.attributes).map(([key, attr]) => (
                <div key={key} className="ml-8 flex items-center gap-2 py-1 group/attr">
                    <TagIcon className="w-4 h-4 text-yellow-600" />
                    <span className="text-gray-300">{key}</span>
                    <span className="text-xs text-gray-500">({attr.type})</span>
                    {isEmergent && <span className="text-xs text-purple-400 border border-purple-500/50 px-1 rounded">inferred</span>}

                    <div className="hidden group-hover/attr:flex gap-1 ml-4">
                        <IconButton
                            onClick={() => onRenameAttribute(node.id, key)}
                            tooltip="Rename"
                            icon={EditIcon}
                            variant="ghost"
                            size="xs"
                            className="text-gray-400 hover:text-white"
                        />
                        <IconButton
                            onClick={() => onMergeAttribute(node.id, key)}
                            tooltip="Merge/Alias (Conflict Resolution)"
                            icon={MergeIcon}
                            variant="ghost"
                            size="xs"
                            className="text-purple-400 hover:text-purple-300"
                        />
                         <IconButton
                            onClick={() => onDeleteAttribute(node.id, key)}
                            tooltip="Delete"
                            icon={TrashIcon}
                            variant="ghost"
                            size="xs"
                            className="text-red-400 hover:text-red-300"
                        />
                    </div>
                </div>
            ))}

            {/* Children */}
            {hasChildren && (
                <ul className="mt-2">
                    {node.children!.map(child => (
                        <OntologyNodeRenderer
                            key={child.id}
                            node={child}
                            expandedNodes={expandedNodes}
                            toggleExpand={toggleExpand}
                            onRenameNode={onRenameNode}
                            onAddNode={onAddNode}
                            onDeleteNode={onDeleteNode}
                            onAddAttribute={onAddAttribute}
                            onRenameAttribute={onRenameAttribute}
                            onMergeAttribute={onMergeAttribute}
                            onDeleteAttribute={onDeleteAttribute}
                        />
                    ))}
                </ul>
            )}
          </div>
        )}
      </li>
    );
};
