import React, {useMemo} from 'react';
import {NodeViewWrapper as NodeViewWrapperComponent} from '@tiptap/react';
import {ExclamationTriangleIcon, TagIcon} from '../ui/icons';
import {ICON_MAP} from '../layout/iconMap';
import {useSettings} from '../../hooks/useSettingsContext';
import {useOntologyIndex} from '../../hooks/useOntologyIndex';
import {validateAttributeValue} from '@notention/core';
import {isCustomEnumValue} from '../../utils/propertyValidation';
import {formatPropertyValue} from '../../utils/propertyDisplay';

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

/** A detail in prose reads as one quiet chip. Validation is the only accent. */
export function PropertyChip({node}: PropertyViewProps) {
    const {name, operator, value, icon, propertyId} = node.attrs;

    const {settings} = useSettings();
    const {propertyTypes} = useOntologyIndex(settings.ontology ?? []);

    // Keys are already canonical - no alias resolution needed
    const definition = propertyTypes.get(name);

    // Use icon from definition if available, fallback to node attr or default
    const effectiveIcon = definition?.icon || icon;
    const IconComponent = effectiveIcon && effectiveIcon in ICON_MAP ? ICON_MAP[effectiveIcon] : TagIcon;

    const validation = useMemo(() => {
        return validateAttributeValue(name, operator, value, definition);
    }, [name, operator, value, definition]);

    const customValue = isCustomEnumValue(definition, value);
    const displayValue = formatPropertyValue(value);

    const stateClasses = !validation.isValid && !customValue
        ? "border-red-500/30 bg-red-500/10 text-red-200 hover:border-red-400/50"
        : customValue
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:border-amber-400/50"
        : "border-[var(--app-line)] bg-[var(--app-raised)] text-[var(--app-muted)] hover:border-[var(--app-line-strong)] hover:text-[var(--app-text-secondary)]";

    const openEditor = (event: React.SyntheticEvent) => {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent('edit-property', {
            detail: {propertyId, key: name, operator, value, icon},
        }));
    };

    return (
        <NodeViewWrapper
            as="span"
            role="button"
            tabIndex={0}
            aria-label={`Edit detail ${name} ${operator} ${value}`}
            className={`node-property mx-0.5 inline-flex max-w-full cursor-pointer select-none items-center gap-1 rounded-md border px-1.5 py-0.5 align-baseline text-[12px] leading-5 transition-colors ${stateClasses}`}
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
                openEditor(event);
            }}
            onKeyDown={(event: React.KeyboardEvent) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                openEditor(event);
            }}
            title={
                !validation.isValid && !customValue
                    ? validation.message
                    : customValue
                    ? `Custom value; ontology expects: ${definition?.options?.join(', ')}`
                    : displayValue === value ? 'Click to edit' : `${value} — click to edit`
            }
        >
            <IconComponent className="h-3 w-3 shrink-0 opacity-70"/>
            <span className="font-medium">{name}</span>
            <span className="text-[var(--app-faint)]" title={operator}>{OPERATOR_GLYPH[operator] ?? operator}</span>
            <span className="max-w-48 truncate text-[var(--app-text-secondary)]">{displayValue}</span>
            {!validation.isValid && !customValue && <ExclamationTriangleIcon className="ml-0.5 h-3 w-3 shrink-0"/>}
        </NodeViewWrapper>
    );
}
