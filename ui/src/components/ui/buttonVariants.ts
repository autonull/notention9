import {cn} from '../../utils/ui';

export const BUTTON_VARIANTS = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'btn-success',
    outline: 'btn-outline',
} as const;

export const BUTTON_SIZES = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
} as const;

export const ICON_BUTTON_VARIANTS = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
} as const;

export const ICON_SIZES = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;
export type IconButtonVariant = keyof typeof ICON_BUTTON_VARIANTS;

export function getButtonVariantClass(variant: ButtonVariant): string {
    return BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary;
}

export function getButtonSizeClass(size: ButtonSize): string {
    return BUTTON_SIZES[size] ?? BUTTON_SIZES.md;
}

export function getIconButtonVariantClass(variant: IconButtonVariant, isActive: boolean = false): string {
    if (variant === 'ghost' && isActive) {
        return ICON_BUTTON_VARIANTS.primary;
    }
    return ICON_BUTTON_VARIANTS[variant] ?? ICON_BUTTON_VARIANTS.ghost;
}

export function getIconSizeClass(size: ButtonSize): string {
    return ICON_SIZES[size] ?? ICON_SIZES.md;
}

export function getButtonClasses({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    touchTarget = true,
    focusRing = true,
    className = '',
    disabled = false,
    loading = false,
}: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    touchTarget?: boolean;
    focusRing?: boolean;
    className?: string;
    disabled?: boolean;
    loading?: boolean;
}) {
    return cn(
        'btn',
        getButtonVariantClass(variant),
        getButtonSizeClass(size),
        fullWidth && 'w-full',
        touchTarget && 'touch-target-48',
        focusRing && 'focus-ring-high-contrast',
        disabled && 'opacity-40 cursor-not-allowed',
        loading && 'opacity-75',
        className
    );
}

export function getIconButtonClasses({
    variant = 'ghost',
    size = 'md',
    touchTarget = true,
    className = '',
    disabled = false,
    isActive = false,
}: {
    variant?: IconButtonVariant;
    size?: ButtonSize;
    touchTarget?: boolean;
    className?: string;
    disabled?: boolean;
    isActive?: boolean;
}) {
    return cn(
        'btn',
        getIconButtonVariantClass(variant, isActive),
        getButtonSizeClass(size),
        touchTarget && 'touch-target-48',
        'focus-ring-high-contrast',
        disabled && 'opacity-40 cursor-not-allowed',
        'active:scale-[0.95] transition-transform duration-50',
        className
    );
}