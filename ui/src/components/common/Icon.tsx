import React from 'react';

export type IconProps = React.SVGProps<SVGSVGElement>;

export const BaseIcon: React.FC<IconProps & { children: React.ReactNode; fill?: string; stroke?: string }> = ({
  className,
  children,
  fill = "none",
  stroke = "currentColor",
  viewBox = "0 0 24 24",
  ...props
}) => (
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
);

export const OutlineIcon: React.FC<IconProps & { children: React.ReactNode }> = (props) => (
  <BaseIcon fill="none" stroke="currentColor" {...props} />
);

export const SolidIcon: React.FC<IconProps & { children: React.ReactNode }> = (props) => (
  <BaseIcon fill="currentColor" stroke="none" {...props} />
);
