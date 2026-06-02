/**
 * Toast.jsx — Système de notifications élégant (Étape 3.3)
 *
 * Usage :
 *   const { showToast, ToastContainer } = useToast();
 *   showToast('Message d\'erreur', 'error');
 *   <ToastContainer />
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, WifiOff } from 'lucide-react';

// ── Icônes et couleurs selon le type ──────────────────────────────
const TOAST_STYLES = {
  success: { icon: CheckCircle, color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  error:   { icon: WifiOff,     color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'   },
  warning: { icon: AlertCircle, color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  info:    { icon: Info,        color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'  },
};

// ── Composant d'un seul toast ──────────────────────────────────────
function Toast({ id, message, type = 'info', onDismiss }) {
  const { icon: Icon, color, bg, border } = TOAST_STYLES[type] ?? TOAST_STYLES.info;

  return (
    <motion.div
      key={id}
      layout
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: 20, scale: 0.9  }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl shadow-black/40 max-w-sm w-full ${bg} ${border}`}
      role="alert"
    >
      <Icon size={18} className={`${color} shrink-0 mt-0.5`} />
      <p className="text-sm text-slate-200 flex-1 leading-relaxed">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="text-slate-500 hover:text-white transition-colors shrink-0"
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ── Conteneur global positionné en bas à droite ───────────────────
export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast {...t} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Hook principal ────────────────────────────────────────────────
let _toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Affiche un toast.
   * @param {string} message  - Texte affiché
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number}  duration - Durée avant auto-dismiss (ms), 0 = manuel
   */
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  return { showToast, toasts, dismiss, ToastContainer: () => (
    <ToastContainer toasts={toasts} onDismiss={dismiss} />
  )};
}
