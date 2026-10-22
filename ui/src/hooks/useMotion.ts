import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {cn} from '../../utils/ui';

export const MOTION_TOKENS = {
    duration: {
        instant: 0,
        fast: 100,
        normal: 200,
        slow: 300,
        slower: 500,
    },
    easing: {
        linear: 'linear',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
    stagger: {
        fast: 20,
        normal: 50,
        slow: 100,
    },
} as const;

export type MotionDuration = keyof typeof MOTION_TOKENS.duration;
export type MotionEasing = keyof typeof MOTION_TOKENS.easing;

export interface MotionProps {
    duration?: MotionDuration | number;
    easing?: MotionEasing | string;
    delay?: number;
}

export function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return reduced;
}

export function useSpring(
    initialValue: number,
    {stiffness = 170, damping = 26, mass = 1, precision = 0.01} = {}
) {
    const [value, setValue] = useState(initialValue);
    const [velocity, setVelocity] = useState(0);
    const targetRef = useRef(initialValue);
    const animationRef = useRef<number | null>(null);
    const reducedMotion = useReducedMotion();

    const animate = useCallback((to: number) => {
        if (reducedMotion) {
            setValue(to);
            targetRef.current = to;
            setVelocity(0);
            return;
        }

        targetRef.current = to;

        const step = (time: number) => {
            const x = value - targetRef.current;
            const v = velocity;

            const a = (-stiffness * x - damping * v) / mass;
            const newVelocity = v + a * 16.67;
            const newValue = targetRef.current + x + newVelocity * 16.67;

            if (Math.abs(newValue - targetRef.current) < precision && Math.abs(newVelocity) < precision) {
                setValue(targetRef.current);
                setVelocity(0);
                animationRef.current = null;
                return;
            }

            setValue(newValue);
            setVelocity(newVelocity);
            animationRef.current = requestAnimationFrame(step);
        };

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        animationRef.current = requestAnimationFrame(step);
    }, [value, velocity, stiffness, damping, mass, precision, reducedMotion]);

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return [value, animate] as const;
}

export function useTransition<T>(
    value: T,
    {duration = 'normal', easing = 'easeOut', delay = 0}: MotionProps = {}
) {
    const [animatedValue, setAnimatedValue] = useState(value);
    const reducedMotion = useReducedMotion();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const dur = typeof duration === 'number' ? duration : MOTION_TOKENS.duration[duration];

        if (reducedMotion || dur === 0) {
            setAnimatedValue(value);
            return;
        }

        timeoutRef.current = setTimeout(() => {
            setAnimatedValue(value);
        }, delay);
    }, [value, duration, delay, reducedMotion]);

    return animatedValue;
}

export function useStaggeredAnimation(
    items: unknown[],
    {duration = 'normal', stagger = 'normal', easing = 'easeOut'}: MotionProps & {stagger?: MotionDuration | number} = {}
) {
    const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
    const reducedMotion = useReducedMotion();

    const dur = typeof duration === 'number' ? duration : MOTION_TOKENS.duration[duration];
    const staggerMs = typeof stagger === 'number' ? stagger : MOTION_TOKENS.stagger[stagger];

    useEffect(() => {
        if (reducedMotion || dur === 0) {
            setVisibleItems(new Set(items.map((_, i) => i)));
            return;
        }

        const timeouts: ReturnType<typeof setTimeout>[] = [];

        items.forEach((_, index) => {
            const timeout = setTimeout(() => {
                setVisibleItems(prev => new Set([...prev, index]));
            }, index * staggerMs);
            timeouts.push(timeout);
        });

        return () => timeouts.forEach(clearTimeout);
    }, [items.length, dur, staggerMs, reducedMotion]);

    return visibleItems;
}

export interface AnimatedPresenceProps {
    children: (isPresent: boolean) => React.ReactNode;
    initial?: boolean;
    onExitComplete?: () => void;
    mode?: 'wait' | 'popLayout';
}

export function AnimatedPresence({
    children,
    initial = true,
    onExitComplete,
    mode = 'wait',
}: AnimatedPresenceProps) {
    const [isPresent, setIsPresent] = useState(initial);
    const [isExiting, setIsExiting] = useState(false);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        if (isPresent) return;

        if (reducedMotion) {
            if (onExitComplete) onExitComplete();
            return;
        }

        setIsExiting(true);
        const timer = setTimeout(() => {
            setIsExiting(false);
            if (onExitComplete) onExitComplete();
        }, MOTION_TOKENS.duration.normal);

        return () => clearTimeout(timer);
    }, [isPresent, reducedMotion, onExitComplete]);

    return children(isPresent && !isExiting);
}

export function useAnimatePresence(
    isOpen: boolean,
    {duration = 'normal', easing = 'easeOut'}: MotionProps = {}
) {
    const [isMounted, setIsMounted] = useState(isOpen);
    const [isVisible, setIsVisible] = useState(isOpen);
    const reducedMotion = useReducedMotion();
    const dur = typeof duration === 'number' ? duration : MOTION_TOKENS.duration[duration];

    useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            if (reducedMotion) {
                setIsVisible(true);
            } else {
                requestAnimationFrame(() => setIsVisible(true));
            }
        } else {
            if (reducedMotion) {
                setIsVisible(false);
                setTimeout(() => setIsMounted(false), 0);
            } else {
                setIsVisible(false);
                setTimeout(() => setIsMounted(false), dur);
            }
        }
    }, [isOpen, reducedMotion, dur]);

    return {isMounted, isVisible};
}

export const ANIMATION_CLASSES = {
    fadeIn: 'animate-fade-in',
    fadeOut: 'animate-fade-out',
    slideInUp: 'animate-slide-in-up',
    slideInDown: 'animate-slide-in-down',
    slideInLeft: 'animate-slide-in-left',
    slideInRight: 'animate-slide-in-right',
    slideOutUp: 'animate-slide-out-up',
    slideOutDown: 'animate-slide-out-down',
    slideOutLeft: 'animate-slide-out-left',
    slideOutRight: 'animate-slide-out-right',
    scaleIn: 'animate-scale-in',
    scaleOut: 'animate-scale-out',
    spin: 'animate-spin',
    pulse: 'animate-pulse',
    ping: 'animate-ping',
    bounce: 'animate-bounce',
} as const;

export function createTransitionClass(
    property: string,
    duration: MotionDuration | number = 'normal',
    easing: MotionEasing | string = 'easeOut'
): string {
    const dur = typeof duration === 'number' ? `${duration}ms` : MOTION_TOKENS.duration[duration];
    const ease = MOTION_TOKENS.easing[easing as MotionEasing] || easing;
    return `transition-${property} duration-[${dur}] ease-[${ease}]`;
}

export const COMMON_TRANSITIONS = {
    all: createTransitionClass('all'),
    colors: createTransitionClass('colors'),
    transform: createTransitionClass('transform'),
    opacity: createTransitionClass('opacity'),
    height: createTransitionClass('height'),
    width: createTransitionClass('width'),
    shadow: createTransitionClass('box-shadow'),
} as const;

export function useHoverAnimation(scale = 1.02) {
    const [isHovered, setIsHovered] = useState(false);
    const reducedMotion = useReducedMotion();

    return {
        isHovered,
        props: {
            onMouseEnter: () => !reducedMotion && setIsHovered(true),
            onMouseLeave: () => setIsHovered(false),
        },
        style: {
            transform: isHovered && !reducedMotion ? `scale(${scale})` : 'scale(1)',
            transition: reducedMotion ? 'none' : COMMON_TRANSITIONS.transform,
        } as React.CSSProperties,
    };
}

export function usePressAnimation(scale = 0.98) {
    const [isPressed, setIsPressed] = useState(false);
    const reducedMotion = useReducedMotion();

    return {
        isPressed,
        props: {
            onMouseDown: () => !reducedMotion && setIsPressed(true),
            onMouseUp: () => setIsPressed(false),
            onMouseLeave: () => setIsPressed(false),
            onTouchStart: () => !reducedMotion && setIsPressed(true),
            onTouchEnd: () => setIsPressed(false),
        },
        style: {
            transform: isPressed && !reducedMotion ? `scale(${scale})` : 'scale(1)',
            transition: reducedMotion ? 'none' : `${COMMON_TRANSITIONS.transform} ${MOTION_TOKENS.duration.fast}ms`,
        } as React.CSSProperties,
    };
}

export function useFocusRing(offset = 2) {
    return {
        className: cn(
            'focus-visible:outline-none',
            `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-${offset}`,
            'focus-visible:ring-offset-gray-950'
        ),
    };
}