import { motion } from 'framer-motion';

/**
 * GlowCard — card with optional gradient border on hover, optional glow halo.
 *
 * Props:
 *   tone:  'brand' | 'success' | 'sunset' | 'ocean' | 'violet' | 'amber'
 *   glow:  boolean (background glow halo)
 *   className: extra classes
 */
export default function GlowCard({ tone = 'brand', glow = false, className = '', children, ...rest }) {
  return (
    <motion.div
      className={`gradient-card ${className}`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      style={glow ? { position: 'relative' } : undefined}
      {...rest}
    >
      {glow && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: '-10%',
            background: 'var(--grad-' + tone + ', var(--grad-brand))',
            filter: 'blur(45px)',
            opacity: 0.15,
            zIndex: -1,
            borderRadius: 'inherit',
          }}
        />
      )}
      <div className="gradient-card__inner">{children}</div>
    </motion.div>
  );
}
