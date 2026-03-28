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

    // Icon mapping by key prefix (from spec)
    const getSpecIcon = (key: string) => {
        const k = key.toLowerCase();
        if (/^(role|job|skill|title)/.test(k)) return '💼';
        if (/^(budget|price|salary|cost)/.test(k)) return '💰';
        if (/^(location|city|country|remote)/.test(k)) return '📍';
        if (/^(deadline|date|when|start)/.test(k)) return '📅';
        if (/^(experience|years|seniority)/.test(k)) return '⏱';
        if (/^(contact|email|phone)/.test(k)) return '📬';
        if (/^(status|state|stage)/.test(k)) return '🚦';
        return '🏷️';
    };

    // Styling matching the "Detail Block" spec
    const baseClasses = "node-property flex items-center justify-between my-3 px-4 py-3 border rounded-lg select-none cursor-pointer transition-colors max-w-full overflow-hidden";
    const validClasses = "bg-[rgba(59,130,246,0.08)] border-[rgba(59,130,246,0.2)] hover:bg-[rgba(59,130,246,0.12)]";
    const invalidClasses = "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] hover:bg-[rgba(239,68,68,0.12)]";

    return (
        <NodeViewWrapper
            as="div"
            className={`${baseClasses} ${validation.isValid ? validClasses : invalidClasses} w-full md:w-fit min-w-[300px]`}
            title={
                !validation.isValid ? validation.message :
                isAlias ? `Using alias for '${canonicalKey}'` : "Click to edit"
            }
        >
            <div className="flex items-center gap-2 overflow-hidden w-full">
                <span className="text-lg flex-shrink-0 mr-1">
                    {effectiveIcon && ICON_MAP[effectiveIcon] ? <IconComponent className="w-5 h-5 text-blue-400" /> : getSpecIcon(name)}
                </span>
                <span className={`font-semibold ${validation.isValid ? 'text-blue-300' : 'text-red-300'} truncate`}>
                    {name}
                    {isAlias && <span className="text-[10px] opacity-70 ml-1 italic text-blue-400">({canonicalKey})</span>}
                </span>
                <span
                    className={`${validation.isValid ? 'text-blue-500' : 'text-red-500'} text-sm font-medium mx-1 flex-shrink-0`}>
                    {operator === 'is' ? ':' : operator}
                </span>
                <span
                    className={`font-mono text-sm px-1.5 py-0.5 rounded ${validation.isValid ? 'bg-blue-900/40 text-blue-100' : 'bg-red-900/40 text-red-100'} truncate`}>{value}</span>
                {!validation.isValid && <ExclamationTriangleIcon className="w-4 h-4 text-red-400 ml-2 flex-shrink-0"/>}
            </div>

            <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity flex-shrink-0 ml-4 group-hover:opacity-100">
                <span className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded transition-colors">
                    [edit]
                </span>
            </div>
        </NodeViewWrapper>
    );
};
