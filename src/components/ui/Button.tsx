import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'default' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'ui-button-primary',
  secondary: 'ui-button-secondary',
  ghost: 'ui-button-ghost',
  default: 'ui-button-primary',
  outline: 'ui-button-outline',
  danger: 'ui-button-danger',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-14 px-8 text-base font-semibold',
};

export function Button({
  className,
  variant = 'default',
  size = 'md',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
      className={cn(
        'ui-button inline-flex items-center justify-center gap-2 rounded-xl font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/75 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
