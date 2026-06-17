import { useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { getSpring } from '../lib/motion';

interface MagneticButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  /** Intensidade do efeito magnético (px) */
  strength?: number;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  /** Desativa deslocamento magnético (ex.: botões compactos em cards) */
  disableMagnetic?: boolean;
}

const variantClasses = {
  primary:
    'bg-white text-canvas hover:bg-red-600 hover:text-white shadow-cinematic border border-white/10 hover:shadow-glow-red',
  secondary:
    'bg-surface text-zinc-300 hover:text-white border border-white/10 hover:border-red-600/50 shadow-cinematic',
  ghost: 'bg-transparent text-zinc-400 hover:text-white border border-transparent',
};

const sizeClasses = {
  sm: 'px-4 py-2.5 text-2xs rounded-xl',
  md: 'px-6 py-3.5 text-xs rounded-2xl',
  lg: 'px-8 py-4 text-sm rounded-3xl',
};

export function MagneticButton({
  children,
  strength = 12,
  variant = 'primary',
  size = 'md',
  className = '',
  disableMagnetic = false,
  onClick,
  type = 'button',
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reducedMotion || disableMagnetic || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    ref.current.style.transform = `translate(${x / strength}px, ${y / strength}px)`;
    ref.current.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    ref.current.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = '';
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!reducedMotion && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        id: Date.now(),
      });
    }
    onClick?.(e);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      transition={getSpring(reducedMotion)}
      className={`ambient-glow relative overflow-hidden font-display font-black uppercase tracking-cinematic-wide inline-flex flex-row items-center justify-center gap-1.5 ease-cinematic duration-cinematic ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      <span className="relative z-10 inline-flex flex-row items-center justify-center gap-1.5">{children}</span>
      <AnimatePresence>
        {ripple && (
          <motion.span
            key={ripple.id}
            layoutId={`ripple-${ripple.id}`}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute w-8 h-8 rounded-full bg-white/30 pointer-events-none"
            style={{ left: ripple.x - 16, top: ripple.y - 16 }}
            onAnimationComplete={() => setRipple(null)}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}
