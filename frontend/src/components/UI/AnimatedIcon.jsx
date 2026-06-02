import { motion } from 'framer-motion';
import './AnimatedIcon.css';

/**
 * AnimatedIcon - Un conteneur premium pour les icônes Lucide.
 * @param {Object} props
 * @param {React.ElementType} props.icon - Le composant icône Lucide.
 * @param {string} props.color - La couleur dominante (brand, success, warning, info, error).
 * @param {number} props.size - Taille de l'icône (default: 20).
 * @param {boolean} props.pulse - Si l'icône doit battre doucement (default: false).
 * @param {string} props.className - Classes CSS additionnelles.
 */
export default function AnimatedIcon({ 
  icon: Icon, 
  color = 'brand', 
  size = 20, 
  pulse = false,
  className = ''
}) {
  return (
    <motion.div 
      className={`ani-icon ani-icon--${color} ${className}`}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.95 }}
      initial={pulse ? { scale: 1 } : false}
      animate={pulse ? { 
        scale: [1, 1.05, 1],
        filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)']
      } : {}}
      transition={pulse ? {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      } : { type: "spring", stiffness: 400, damping: 17 }}
    >
      <div className="ani-icon__glow" />
      <div className="ani-icon__inner">
        <Icon size={size} strokeWidth={2.5} />
      </div>
    </motion.div>
  );
}
