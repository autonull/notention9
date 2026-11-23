import React from 'react';
import type {Tone} from '../../styles/tone';

export type IconProps = React.SVGProps<SVGSVGElement> & { title?: string; tone?: Tone };

const TONE_TEXT: Record<Tone, string> = {
    neutral: 'text-[var(--app-muted)]',
    accent: 'text-[var(--app-accent-text)]',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
};

export function BaseIcon({
    className,
    children,
    tone,
    fill = "none",
    stroke = "currentColor",
    viewBox = "0 0 24 24",
    ...props
}: IconProps & { children: React.ReactNode; fill?: string; stroke?: string }) { return (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className={[tone ? TONE_TEXT[tone] : '', className].filter(Boolean).join(' ')}
        fill={fill}
        viewBox={viewBox}
        stroke={stroke}
        strokeWidth={stroke === "none" ? 0 : 2}
        {...props}
    >
        {children}
    </svg>
); }

export function OutlineIcon(props: IconProps & { children: React.ReactNode }) { return (
    <BaseIcon fill="none" stroke="currentColor" {...props} />
); }

export function SolidIcon(props: IconProps & { children: React.ReactNode }) { return (
    <BaseIcon fill="currentColor" stroke="none" {...props} />
); }
