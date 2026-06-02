import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Database, HelpCircle } from 'lucide-react';
import SEO from '../components/SEO/SEO';
import './NotFound.css';

export default function NotFound() {
  return (
    <>
      <SEO title="Page non trouvée — DataMediator" description="La page que vous cherchez n'existe pas." />
      <div className="nf-shell">
        <div className="nf-glow" />

        <motion.div
          className="nf-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="nf-mark">
            <Database size={28} />
          </div>

          <div className="nf-code mono">404</div>

          <h1 className="h2">Cette page est introuvable</h1>
          <p className="muted">
            L'URL que vous avez suivie n'existe plus dans le médiateur,
            ou vous n'avez pas les droits pour y accéder.
          </p>

          <div className="nf-actions">
            <button
              type="button"
              className="ds-btn ds-btn--secondary"
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={16} /> Retour
            </button>
            <Link to="/" className="ds-btn ds-btn--primary">
              <Home size={16} /> Accueil
            </Link>
          </div>

          <div className="nf-help">
            <HelpCircle size={14} />
            <span>
              Besoin d'aide ? Consultez <Link to="/">le tableau de bord</Link> ou contactez l'administrateur du projet.
            </span>
          </div>
        </motion.div>
      </div>
    </>
  );
}
