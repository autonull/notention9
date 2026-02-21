import React, { useMemo } from 'react';
import {NodeViewProps, NodeViewWrapper} from '@tiptap/react';
import {ExclamationTriangleIcon, TagIcon} from '../common/icons';
import {ICON_MAP} from '../layout/iconMap';
import {useSettings} from '../../hooks/useSettingsContext';
import {useOntologyIndex} from '../../hooks/useOntologyIndex';
import {validatePropertyAgainstOntology} from '../../utils/propertyValidation';
import {getCanonicalKey} from '@notention/core';

export const PropertyChip = (props: NodeViewProps) => {
    const {node} = props;
    const {name, operator, value, icon} = node.attrs;

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
};
