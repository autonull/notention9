import React, {useMemo} from 'react';
import {NodeViewWrapper as NodeViewWrapperComponent} from '@tiptap/react';
import {ExclamationTriangleIcon, TagIcon} from '../ui/icons';
import {ICON_MAP} from '../layout/iconMap';
import {useSettings} from '../../hooks/useSettingsContext';
import {useOntologyIndex} from '../../hooks/useOntologyIndex';
import {validateAttributeValue} from '@notention/core';
import {isCustomEnumValue} from '../../utils/propertyValidation';

const NodeViewWrapper = NodeViewWrapperComponent as any;

const OPERATOR_GLYPH: Record<string, string> = {
    'is': '=',
    'is not': '≠',
    'greater than': '>',
    'less than': '<',
    'between': '↔',
    'near': '≈',
    'before': '←',
    'after': '→',
};

interface PropertyAttrs {
    name: string;
    operator: string;
    value: string;
    icon?: string;
    propertyId?: string | null;
}

interface PropertyViewProps {
    node: {attrs: PropertyAttrs};
}

export function PropertyChip({node}: PropertyViewProps) {
    const {name, operator, value, icon, propertyId} = node.attrs;

    const {settings} = useSettings();
    const {propertyTypes} = useOntologyIndex(settings.ontology ?? []);

    // Keys are already canonical - no alias resolution needed
    const definition = propertyTypes.get(name);

    // Use icon from definition if available, fallback to node attr or default
    const effectiveIcon = definition?.icon || icon;
    const IconComponent = effectiveIcon && effectiveIcon in ICON_MAP ? ICON_MAP[effectiveIcon] : TagIcon;

    const isAlias = false;

    const validation = useMemo(() => {
        return validateAttributeValue(name, operator, value, definition);
    }, [name, operator, value, definition]);

    const customValue = isCustomEnumValue(definition, value);

    // Styling
    const baseClasses = "node-property inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 border rounded-md select-none cursor-pointer transition-colors text-sm";
    const validClasses = "bg-blue-900/30 border-blue-700/50 hover:bg-blue-900/50 hover:border-blue-600 text-blue-100";
    const invalidClasses = "bg-red-900/30 border-red-700/50 hover:bg-red-900/50 hover:border-red-600 text-red-100";
    const customClasses = "bg-amber-900/20 border-amber-700/40 hover:bg-amber-900/40 hover:border-amber-600/60 text-amber-100";

    return (
        <NodeViewWrapper
            as="span"
            className={`${baseClasses} ${!validation.isValid && !customValue ? invalidClasses : customValue ? customClasses : validClasses}`}
            data-property-id={propertyId ?? undefined}
            onPointerDown={(event: React.PointerEvent) => {
                event.preventDefault();
                event.stopPropagation();
                window.dispatchEvent(new CustomEvent('edit-property', {
                    detail: {propertyId, key: name, operator, value, icon},
                }));
            }}
            onClick={(event: React.MouseEvent) => {
                if (event.detail !== 0) return;
                event.preventDefault();
                event.stopPropagation();
                window.dispatchEvent(new CustomEvent('edit-property', {
                    detail: {propertyId, key: name, operator, value, icon},
                }));
            }}
            title={
                !validation.isValid && !customValue
                    ? validation.message
                    : customValue
                    ? `Custom value; ontology expects: ${definition?.options?.join(', ')}`
                    : "Click to edit"
            }
        >
            <IconComponent className={`w-3.5 h-3.5 ${!validation.isValid && !customValue ? 'text-red-400' : customValue ? 'text-amber-400' : 'text-blue-400'}`}/>
            <span className={`font-semibold ${!validation.isValid && !customValue ? 'text-red-300' : customValue ? 'text-amber-200' : 'text-blue-300'} flex items-center gap-1`}>
                {name}
            </span>
            <span
                className={`${!validation.isValid && !customValue ? 'text-red-500' : customValue ? 'text-amber-400' : 'text-blue-500'} text-xs font-medium`}
                title={operator}
            >{OPERATOR_GLYPH[operator] ?? operator}</span>
            <span
                className={`font-mono px-1 rounded ${!validation.isValid && !customValue ? 'bg-red-900/50 text-red-200' : customValue ? 'bg-amber-900/40 text-amber-200' : 'bg-blue-900/50 text-blue-200'}`}>{value}</span>
            {!validation.isValid && !customValue && <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400 ml-1"/>}
        </NodeViewWrapper>
    );
}
