import React from 'react';
import {SectionHeader} from '../ui/kit';
import {cn} from '../../utils/ui';

interface SettingsSectionProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
}

/** One settings section: 15 px heading, one gap rhythm, one surface. */
export function SettingsSection({title, description, actions, children, className}: SettingsSectionProps) {
    return (
        <section className={cn('space-y-3', className)}>
            <SectionHeader title={title} description={description} actions={actions}/>
            {children}
        </section>
    );
}
