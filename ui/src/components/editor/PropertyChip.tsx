import React, { useMemo } from 'react';
import {NodeViewProps, NodeViewWrapper} from '@tiptap/react';
import {ExclamationTriangleIcon, TagIcon} from '../common/icons';
import {ICON_MAP} from '../layout/iconMap';
import {useSettings} from '../../hooks/useSettingsContext';
import {useOntologyIndex} from '../../hooks/useOntologyIndex';
import {validatePropertyAgainstOntology} from '../../utils/propertyValidation';

export const PropertyChip = (props: NodeViewProps) => {
    const {node} = props;
    const {name, operator, value, icon} = node.attrs;

    const {settings} = useSettings();
    const {propertyTypes} = useOntologyIndex(settings.ontology);

    const IconComponent = icon && ICON_MAP[icon] ? ICON_MAP[icon] : TagIcon;

    // Enhanced Validation Logic
    const definition = propertyTypes.get(name);

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
            title={validation.isValid ? "Click to edit" : validation.message}
        >
            <IconComponent className={`w-3.5 h-3.5 ${validation.isValid ? 'text-blue-400' : 'text-red-400'}`}/>
            <span className={`font-semibold ${validation.isValid ? 'text-blue-300' : 'text-red-300'}`}>{name}</span>
            <span
                className={`${validation.isValid ? 'text-blue-500' : 'text-red-500'} text-xs uppercase font-bold`}>{operator}</span>
            <span
                className={`font-mono px-1 rounded ${validation.isValid ? 'bg-blue-900/50 text-blue-200' : 'bg-red-900/50 text-red-200'}`}>{value}</span>
            {!validation.isValid && <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400 ml-1"/>}
        </NodeViewWrapper>
    );
};
