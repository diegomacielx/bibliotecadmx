import { motion } from 'framer-motion';
import { Icon } from './Icon';
import { GridSkeleton } from './Skeleton';
import { fadeUp } from '../lib/motion';

interface LoadingScreenProps {
  message?: string;
  slowConnection?: boolean;
}

export function LoadingScreen({
  message = 'Conectando ao servidor...',
  slowConnection = false,
}: LoadingScreenProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="page-canvas min-h-screen flex flex-col items-center justify-center relative px-fluid-md"
    >
      <div className="relative z-10 flex flex-col items-center">
        <Icon name="loader" className="w-12 h-12 animate-spin text-red-600 opacity-60 mb-fluid-sm" />
        <p className="text-2xs font-display font-black uppercase tracking-widest text-zinc-500">{message}</p>
      </div>
      <div className="relative z-10 w-full max-w-cinema mt-fluid-xl">
        <GridSkeleton count={6} />
      </div>
      {slowConnection && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-2xs text-red-500 uppercase font-black mt-fluid-md bg-accent-muted px-4 py-2 rounded-xl border border-red-900/30"
        >
          A conexão parece lenta. Aguarde...
        </motion.p>
      )}
    </motion.div>
  );
}
