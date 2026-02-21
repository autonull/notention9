import React, {useState} from 'react';
import type {OntologyNode} from '@notention/core';
import {ChevronDownIcon, PlusIcon, TrashIcon} from '../common/icons';
import {AttributeList} from './AttributeList';
import {IconButton} from '../common/IconButton';

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
        <div className="relative">
            {/* Tree connecting lines */}
            {level > 0 && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-px bg-gray-800"
                    style={{ left: `${(level * 1.5) - 0.75}rem` }}
                />
            )}

            <div style={{ paddingLeft: `${level * 1.5}rem` }} className="relative">
                {level > 0 && (
                    <div
                        className="absolute left-0 top-3 w-3 h-px bg-gray-800"
                        style={{ left: `${(level * 1.5) - 0.75}rem` }}
                    />
                )}

                <div className="flex items-center py-1.5 group hover:bg-gray-800/30 rounded-lg transition-colors pr-2 -ml-2 pl-2">
                    <div
                        className={`flex items-center justify-center w-5 h-5 mr-2 rounded cursor-pointer transition-colors ${hasChildren ? 'hover:bg-gray-700 text-gray-400 hover:text-white' : ''}`}
                        onClick={() => hasChildren && setIsOpen(!isOpen)}
                    >
                        {hasChildren ? (
                            <ChevronDownIcon
                                className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                            />
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                        )}
                    </div>

                    <div className="flex items-center flex-1 cursor-pointer" onClick={() => hasChildren && setIsOpen(!isOpen)}>
                        <span className="font-semibold text-blue-300 group-hover:text-blue-200 transition-colors">
                            {node.label}
                        </span>

                        {tagCount > 0 && (
                            <span className="ml-2 text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full border border-gray-700 font-mono"
                                  title="Usage count">
                                {tagCount}
                            </span>
                        )}

                        {node.description && (
                            <span className="ml-3 text-xs text-gray-500 hidden md:inline group-hover:text-gray-400 transition-colors">
                                {node.description}
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
                                    className="text-green-400 hover:bg-green-900/20"
                                />
                            )}
                            {onDeleteNode && (
                                <IconButton
                                    icon={TrashIcon}
                                    onClick={() => onDeleteNode(node.id)}
                                    title="Delete Node"
                                    size="xs"
                                    variant="ghost"
                                    className="text-gray-600 hover:text-red-400 hover:bg-red-900/20"
                                />
                            )}
                        </div>
                    )}
                </div>

                {isOpen && (
                    <div className="relative">
                        {node.attributes && Object.keys(node.attributes).length > 0 && (
                            <AttributeList attributes={node.attributes} usageStats={usageStats} level={level + 1}/>
                        )}

                        {hasChildren && (
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
                )}
            </div>
        </div>
    );
};
