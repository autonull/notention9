import React from 'react';

export type IconProps = React.SVGProps<SVGSVGElement>;

export function BaseIcon({
                                                                                                                  className,
                                                                                                                  children,
                                                                                                                  fill = "none",
                                                                                                                  stroke = "currentColor",
                                                                                                                  viewBox = "0 0 24 24",
                                                                                                                  ...props
                                                                                                              }: IconProps & { children: React.ReactNode; fill?: string; stroke?: string }) { return (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className}
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
