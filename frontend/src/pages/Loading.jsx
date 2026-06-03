import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Network, Layers3, Shield, CheckCircle2
} from 'lucide-react';
import SEO from '../components/SEO/SEO';

const STEPS = [
  { id: 'sources',      label: 'Connexion aux sources hétérogènes', emoji: '🔌', dur: 700 },
  { id: 'mediator',     label: 'Initialisation du médiateur global', emoji: '🌐', dur: 600 },
  { id: 'rules',        label: 'Calcul des règles GAV et vues LAV',  emoji: '🧮', dur: 600 },
  { id: 'security',     label: 'Application des politiques RBAC',    emoji: '🛡️', dur: 500 },
  { id: 'resolution',   label: 'Résolution des conflits d\'entités', emoji: '🧬', dur: 500 },
  { id: 'ready',        label: 'Prêt',                               emoji: '🚀', dur: 400 },
];

export default function Loading({ onComplete }) {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (activeStep >= STEPS.length) {
      setIsReady(true);
      // Automatically redirect after a short delay for fluid transition
      const t = setTimeout(() => {
        onComplete?.();
      }, 600);
      return () => clearTimeout(t);
    }

    const { dur } = STEPS[activeStep];
    const tick = 20;
    const inc = (100 * tick) / dur;
    let p = 0;

    const id = setInterval(() => {
      p = Math.min(100, p + inc);
      setProgress(p);
      if (p >= 100) {
        clearInterval(id);
        setTimeout(() => {
          setActiveStep(s => s + 1);
          setProgress(0);
        }, 100);
      }
    }, tick);

    return () => clearInterval(id);
  }, [activeStep, onComplete]);

  return (
    <>
      <SEO title="Chargement — DataMediator Pro" description="Initialisation du médiateur…" />
      <div className="fixed inset-0 bg-[#06060a] flex flex-col items-center justify-center overflow-hidden z-50">
        
        {/* Ambient background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[120px]" />
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-violet-600/5 blur-[80px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] rounded-full bg-blue-600/5 blur-[60px]" />

          {/* Grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Main card */}
        <div className="relative z-10 flex flex-col items-center max-w-3xl w-full px-8">
          
          {/* Logo / Brand */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center mb-8"
          >
            {/* Logo icon */}
            <div className="relative mb-5">
              <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain rounded-2xl" />
              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-2xl border border-indigo-500/20 animate-ping opacity-30" />
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
              DataMediator <span className="text-indigo-400">Pro</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">Status</span>
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono">INITIALISATION</span>
            </div>
          </motion.div>

          {/* Steps list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-full max-w-lg mb-8 bg-zinc-900/40 border border-white/5 rounded-2xl p-5 backdrop-blur-md"
          >
            <p className="text-center text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-4">Pipeline de démarrage</p>
            <div className="flex flex-col gap-2.5">
              {STEPS.map((s, idx) => {
                const isCompleted = idx < activeStep;
                const isActive = idx === activeStep;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs transition-all duration-300 ${
                      isActive
                        ? 'bg-indigo-600/10 border-indigo-500/40 text-white shadow-[0_0_12px_rgba(99,102,241,0.15)] font-semibold'
                        : isCompleted
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-950/40 border-zinc-900/50 text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base leading-none">{s.emoji}</span>
                      <span>{s.label}</span>
                    </div>
                    {isActive ? (
                      <span className="text-[10px] font-mono text-indigo-400">{Math.round(progress)}%</span>
                    ) : isCompleted ? (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">✓ Terminé</span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-600">En attente</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Global progress bar */}
            <div className="mt-5">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mb-1.5 px-1">
                <span>PROGRESSION GLOBALE</span>
                <span>{Math.round(((activeStep + (activeStep < STEPS.length ? progress / 100 : 0)) / STEPS.length) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-950/60 rounded-full overflow-hidden border border-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${((activeStep + (activeStep < STEPS.length ? progress / 100 : 0)) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          </motion.div>

          {/* CTA Button or Status */}
          <AnimatePresence>
            {isReady && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => onComplete?.()}
                  className="group relative px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black text-xs rounded-xl transition-all duration-200 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:scale-105 active:scale-95 z-50 pointer-events-auto uppercase tracking-widest"
                >
                  Accéder au Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            className="text-[9px] text-zinc-500 mt-6 font-mono text-center"
          >
            DataMediator Pro · GAV & LAV Integration Engine · Master Intégration de Données
          </motion.p>
        </div>
      </div>
    </>
  );
}
