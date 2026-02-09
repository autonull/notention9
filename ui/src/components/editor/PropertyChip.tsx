import React from 'react';
import {NodeViewProps, NodeViewWrapper} from '@tiptap/react';
import {ExclamationTriangleIcon, TagIcon} from '../common/icons';
import {ICON_MAP} from '../layout/iconMap';
import {useSettings} from '../../hooks/useSettingsContext';
import {useOntologyIndex} from '../../hooks/useOntologyIndex';

export const PropertyChip = (props: NodeViewProps) => {
    const {node} = props;
    const {name, operator, value, icon} = node.attrs;

    const {settings} = useSettings();
    const {propertyTypes} = useOntologyIndex(settings.ontology);

    const IconComponent = icon && ICON_MAP[icon] ? ICON_MAP[icon] : TagIcon;

    // Validation Logic
    const definition = propertyTypes.get(name);
    let isValid = true;
    let errorMessage = '';

    if (definition) {
        // Check options
        if (definition.options && definition.options.length > 0) {
            if (!definition.options.includes(value)) {
                isValid = false;
                errorMessage = `Expected one of: ${definition.options.join(', ')}`;
            }
        }

        // Check range - Cast to any
        const defAny = definition as any;
        if (defAny.range) {
            const numVal = parseFloat(value);
            const [min, max] = defAny.range;
            if (isNaN(numVal)) {
                isValid = false;
                errorMessage = 'Value must be a number';
            } else if (numVal < min || numVal > max) {
                isValid = false;
                errorMessage = `Value must be between ${min} and ${max}`;
            }
        }
    }

    // Styling
    const baseClasses = "node-property inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 border rounded-md select-none cursor-pointer transition-colors text-sm";
    const validClasses = "bg-blue-900/30 border-blue-700/50 hover:bg-blue-900/50 hover:border-blue-600 text-blue-100";
    const invalidClasses = "bg-red-900/30 border-red-700/50 hover:bg-red-900/50 hover:border-red-600 text-red-100";

    return (
        <NodeViewWrapper
            as="span"
            className={`${baseClasses} ${isValid ? validClasses : invalidClasses}`}
            title={isValid ? "Click to edit" : errorMessage}
        >
            <IconComponent className={`w-3.5 h-3.5 ${isValid ? 'text-blue-400' : 'text-red-400'}`}/>
            <span className={`font-semibold ${isValid ? 'text-blue-300' : 'text-red-300'}`}>{name}</span>
            <span
                className={`${isValid ? 'text-blue-500' : 'text-red-500'} text-xs uppercase font-bold`}>{operator}</span>
            <span
                className={`font-mono px-1 rounded ${isValid ? 'bg-blue-900/50 text-blue-200' : 'bg-red-900/50 text-red-200'}`}>{value}</span>
            {!isValid && <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400 ml-1"/>}
        </NodeViewWrapper>
    );
};
