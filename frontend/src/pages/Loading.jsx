import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Shield,
  Network,
  Layers3,
  CheckCircle2,
} from 'lucide-react';
import SEO from '../components/SEO/SEO';
import './Loading.css';

const STEPS = [
  { icon: Database, label: 'Connexion aux sources hétérogènes', dur: 700 },
  { icon: Network,  label: 'Chargement du schéma global virtuel', dur: 600 },
  { icon: Layers3,  label: 'Calcul des règles GAV et vues LAV', dur: 600 },
  { icon: Shield,   label: 'Application des politiques RBAC', dur: 500 },
  { icon: CheckCircle2, label: 'Prêt', dur: 400 },
];

export default function Loading({ onComplete }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length) {
      onComplete?.();
      return;
    }
    const { dur } = STEPS[step];
    const tick = 24;
    const inc = (100 * tick) / dur;
    let p = 0;
    const id = setInterval(() => {
      p = Math.min(100, p + inc);
      setProgress(p);
      if (p >= 100) {
        clearInterval(id);
        setTimeout(() => {
          setStep((s) => s + 1);
          setProgress(0);
        }, 120);
      }
    }, tick);
    return () => clearInterval(id);
  }, [step, onComplete]);

  const currentStep = STEPS[Math.min(step, STEPS.length - 1)];
  const CurrentIcon = currentStep.icon;
  const isLast = step >= STEPS.length;

  return (
    <>
      <SEO title="Chargement — DataMediator" description="Initialisation du médiateur…" />
      <div className="ld-shell">
        <div className="ld-glow" />
        <motion.div
          className="ld-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Logo */}
          <motion.div
            className="ld-mark"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Database size={28} />
          </motion.div>

          <div className="ld-title">
            <h1 className="h3">DataMediator</h1>
            <p className="muted">Plateforme de médiation virtuelle</p>
          </div>

          {/* Steps timeline */}
          <ul className="ld-timeline">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const state =
                idx < step ? 'done' :
                idx === step ? 'active' : 'idle';
              return (
                <li key={idx} className={`ld-timeline__item ld-timeline__item--${state}`}>
                  <span className="ld-timeline__icon">
                    {state === 'done' ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                  </span>
                  <span className="ld-timeline__label">{s.label}</span>
                </li>
              );
            })}
          </ul>

          {/* Active step + progress */}
          {!isLast && (
            <div className="ld-current">
              <div className="ld-current__head">
                <motion.span
                  className="ld-current__icon"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                >
                  <CurrentIcon size={16} />
                </motion.span>
                <span>{currentStep.label}</span>
                <span className="muted text-sm mono">{Math.round(progress)}%</span>
              </div>
              <div className="ld-bar">
                <motion.div
                  className="ld-bar__fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          )}

          <div className="ld-footer">
            <span className="muted text-xs">v3.1.0 · Master Intégration de Données</span>
          </div>
        </motion.div>
      </div>
    </>
  );
}
