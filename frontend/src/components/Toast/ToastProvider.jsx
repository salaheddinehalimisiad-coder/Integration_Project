import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import './toast.css';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const ICONS = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
  warning: AlertTriangle,
};

let _id = 0;

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((opts) => {
    const id = ++_id;
    const t = {
      id,
      kind: opts.kind || 'info',
      title: opts.title || '',
      description: opts.description || '',
      duration: opts.duration ?? 4500,
      image: opts.image || null,
    };
    setToasts((prev) => [...prev, t]);
    if (t.duration > 0) {
      setTimeout(() => dismiss(id), t.duration);
    }
    return id;
  }, [dismiss]);

  const api = {
    show,
    dismiss,
    success: (title, description, opts = {}) => show({ ...opts, kind: 'success', title, description }),
    error:   (title, description, opts = {}) => show({ ...opts, kind: 'error',   title, description }),
    info:    (title, description, opts = {}) => show({ ...opts, kind: 'info',    title, description }),
    warning: (title, description, opts = {}) => show({ ...opts, kind: 'warning', title, description }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.kind] || Info;
            return (
              <motion.div
                key={t.id}
                className={`toast toast--${t.kind}`}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                layout
              >
                {t.image ? (
                  <img src={t.image} alt="logo" className="w-10 h-10 object-contain mr-1 drop-shadow-md" />
                ) : (
                  <Icon size={18} className="toast__icon" />
                )}
                <div className="toast__body">
                  {t.title && <div className="toast__title">{t.title}</div>}
                  {t.description && <div className="toast__desc">{t.description}</div>}
                </div>
                <button className="toast__close" onClick={() => dismiss(t.id)} aria-label="Fermer">
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
