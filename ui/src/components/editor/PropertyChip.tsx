import React, { useMemo } from 'react';
import {NodeViewProps, NodeViewWrapper} from '@tiptap/react';
import {ExclamationTriangleIcon, TagIcon} from '../common/icons';
import {ICON_MAP} from '../layout/iconMap';
import {useSettings} from '../../hooks/useSettingsContext';
import {useOntologyIndex} from '../../hooks/useOntologyIndex';
import {validatePropertyAgainstOntology} from '../../utils/propertyValidation';
import {getCanonicalKey} from '@notention/core';
import {InlinePropertyForm} from './InlinePropertyForm';

export function PropertyChip(props: NodeViewProps) {
    const {node, editor, updateAttributes, deleteNode, getPos} = props;
    const {name, operator, value, icon, isEditing} = node.attrs;

    const {settings} = useSettings();
    const {propertyTypes} = useOntologyIndex(settings.ontology);

    const canonicalKey = useMemo(() => {
        return getCanonicalKey(name, settings.ontology);
    }, [name, settings.ontology]);

    // Enhanced Validation Logic - Use canonical key to look up definition
    const definition = propertyTypes.get(canonicalKey);

    // Use icon from definition if available (for aliases or typed properties), fallback to node attr or default
    const effectiveIcon = definition?.icon || icon;
    const IconComponent = effectiveIcon && ICON_MAP[effectiveIcon] ? ICON_MAP[effectiveIcon] : TagIcon;

    const isAlias = canonicalKey !== name;

    const validation = useMemo(() => {
        return validatePropertyAgainstOntology(name, operator, value, definition);
    }, [name, operator, value, definition]);

    const handleUpdate = (newKey: string, newOperator: string, newValue: string, isValid: boolean) => {
        updateAttributes({
            name: newKey,
            operator: newOperator,
            value: newValue,
            isEditing: false
        });

        // Return focus to the editor
        setTimeout(() => {
            if (editor && !editor.isDestroyed) {
                editor.commands.focus();
            }
        }, 10);
    };

    const handleCancel = () => {
        if (!name && !value) {
            // It was a newly inserted empty node, so delete it if canceled
            deleteNode();
        } else {
            // It was an existing node being edited, so just turn off editing
            updateAttributes({isEditing: false});
        }

        // Return focus to the editor
        setTimeout(() => {
            if (editor && !editor.isDestroyed) {
                editor.commands.focus();
            }
        }, 10);
    };

    const startEditing = () => {
        updateAttributes({isEditing: true});
    };

    if (isEditing) {
        return (
            <NodeViewWrapper as="span" className="inline-block align-middle">
                <InlinePropertyForm
                    initialKey={name || ''}
                    initialOperator={operator || 'is'}
                    initialValue={value || ''}
                    onUpdate={handleUpdate}
                    onCancel={handleCancel}
                    editor={editor}
                    getPos={getPos as () => number}
                />
            </NodeViewWrapper>
        );
    }

    // Styling
    const baseClasses = "node-property inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 border rounded-md select-none cursor-pointer transition-colors text-sm";
    const validClasses = "bg-blue-900/30 border-blue-700/50 hover:bg-blue-900/50 hover:border-blue-600 text-blue-100";
    const invalidClasses = "bg-red-900/30 border-red-700/50 hover:bg-red-900/50 hover:border-red-600 text-red-100";

    return (
        <NodeViewWrapper
            as="span"
            className={`${baseClasses} ${validation.isValid ? validClasses : invalidClasses}`}
            title={
                !validation.isValid ? validation.message :
                isAlias ? `Using alias for '${canonicalKey}'` : "Click to edit"
            }
            onClick={startEditing}
        >
            <IconComponent className={`w-3.5 h-3.5 ${validation.isValid ? 'text-blue-400' : 'text-red-400'}`}/>
            <span className={`font-semibold ${validation.isValid ? 'text-blue-300' : 'text-red-300'} flex items-center gap-1`}>
                {name}
                {isAlias && <span className="text-[10px] opacity-70 ml-0.5 italic text-blue-400">({canonicalKey})</span>}
            </span>
            <span
                className={`${validation.isValid ? 'text-blue-500' : 'text-red-500'} text-xs uppercase font-bold`}>{operator}</span>
            <span
                className={`font-mono px-1 rounded ${validation.isValid ? 'bg-blue-900/50 text-blue-200' : 'bg-red-900/50 text-red-200'}`}>{value}</span>
            {!validation.isValid && <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400 ml-1"/>}
        </NodeViewWrapper>
    );
}
