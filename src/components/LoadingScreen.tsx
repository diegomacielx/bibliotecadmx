import { motion } from 'framer-motion';
import { Icon } from './Icon';
import { GridSkeleton } from './Skeleton';
import { fadeUp } from '../lib/motion';
import { useMobileUi } from '../hooks/useMediaQuery';

interface LoadingScreenProps {
  message?: string;
  slowConnection?: boolean;
}

export function LoadingScreen({
  message = 'Conectando ao servidor...',
  slowConnection = false,
}: LoadingScreenProps) {
  const isMobile = useMobileUi();

  return (
    <motion.div
      variants={isMobile ? undefined : fadeUp}
      initial={isMobile ? false : 'hidden'}
      animate={isMobile ? undefined : 'visible'}
      className="page-canvas min-h-screen flex flex-col items-center justify-center relative px-fluid-md"
    >
      <div className="relative z-10 flex flex-col items-center">
        <Icon name="loader" className="w-12 h-12 animate-spin text-red-600 opacity-60 mb-fluid-sm" />
        <p className="text-2xs font-display font-black uppercase tracking-widest text-zinc-500">{message}</p>
      </div>
      {!isMobile && (
        <div className="relative z-10 w-full max-w-cinema mt-fluid-xl">
          <GridSkeleton count={6} />
        </div>
      )}
      {slowConnection && (
        <p className="relative z-10 text-2xs text-red-500 uppercase font-black mt-fluid-md bg-accent-muted px-4 py-2 rounded-xl border border-red-900/30">
          A conexão parece lenta. Aguarde...
        </p>
      )}
    </motion.div>
  );
}
