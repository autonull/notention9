import React from 'react';
import {buildWidgetMetadata, type OntologyAttribute, type WidgetType} from '@notention/core';
import {CurrencyWidget} from './CurrencyWidget';
import {DateWidget} from './DateWidget';
import {EnumWidget} from './EnumWidget';
import {LocationWidget} from './LocationWidget';
import {TextWidget} from './TextWidget';
import type {WidgetProps} from './types';

type WidgetComponent = React.ComponentType<
    WidgetProps & {type?: string; options?: string[]; placeholder?: string; operator?: string}
>;

const WIDGET_COMPONENTS: Record<WidgetType, WidgetComponent> = {
    'text-input': TextWidget,
    'number-input': CurrencyWidget,
    'datetime-picker': DateWidget,
    'date-picker': DateWidget,
    'map-picker': LocationWidget,
    'dropdown': EnumWidget,
    'contact-selector': TextWidget,
};

export interface AttributeWidgetProps extends WidgetProps {
    attribute?: OntologyAttribute;
    operator?: string;
    placeholder?: string;
}

export function AttributeWidget({attribute, ...props}: AttributeWidgetProps) {
    const widgetType = attribute ? buildWidgetMetadata(attribute).type : 'text-input';
    const Component = WIDGET_COMPONENTS[widgetType] ?? TextWidget;

    return <Component {...props} type={attribute?.type} options={attribute?.options} />;
}
