import { motion, AnimatePresence } from 'framer-motion';
import type { ToastState } from '../types';
import { Icon } from './Icon';

interface ToastProps {
  toast: ToastState;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const isError = toast.type === 'error';

  return (
    <div className="toast-viewport" aria-live="polite">
      <AnimatePresence mode="wait">
        {toast.show && (
          <motion.div
            key={toast.msg}
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={`toast-card ${isError ? 'toast-card--error' : 'toast-card--success'}`}
            onClick={onClose}
          >
            <span className="toast-card-icon" aria-hidden="true">
              <Icon
                name={isError ? 'x' : 'circlecheck'}
                className="w-4 h-4"
                strokeWidth={2}
              />
            </span>
            <div className="toast-card-body">
              <p className="toast-card-title">{isError ? 'Atenção' : 'Pronto'}</p>
              <p className="toast-card-msg">{toast.msg}</p>
            </div>
            <button
              type="button"
              className="toast-card-close"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Fechar notificação"
            >
              <Icon name="x" className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
