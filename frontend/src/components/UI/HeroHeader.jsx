import { motion } from 'framer-motion';

/**
 * HeroHeader — Premium page banner with gradient background, eyebrow,
 * title (with optional gradient accent), subtitle, optional pills + CTA.
 *
 * Props:
 *   eyebrow:  string  (small uppercase chip above the title)
 *   title:    ReactNode  (main heading)
 *   accent:   string  (substring that will be replaced by gradient text)
 *   subtitle: string
 *   pills:    [{ icon, label }]
 *   cta:      { label, onClick, icon }
 */
export default function HeroHeader({ eyebrow, title, accent, subtitle, pills = [], cta, children }) {
  const renderTitle = () => {
    if (!accent || typeof title !== 'string') return title;
    const idx = title.indexOf(accent);
    if (idx < 0) return title;
    const before = title.slice(0, idx);
    const after = title.slice(idx + accent.length);
    return (
      <>
        {before}
        <span>{accent}</span>
        {after}
      </>
    );
  };

  return (
    <motion.section
      className="hero"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="hero__content">
        {/* Eyebrow removed globally as requested */}
        {title && <h1 className="hero__title">{renderTitle()}</h1>}
        {subtitle && <p className="hero__subtitle">{subtitle}</p>}
        {pills.length > 0 && (
          <div className="hero__pills">
            {pills.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.span
                  key={i}
                  className="hero__pill"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                >
                  {Icon && <Icon size={13} />} {p.label}
                </motion.span>
              );
            })}
          </div>
        )}
        {cta && (
          <button className="hero__cta" onClick={cta.onClick}>
            {cta.label}
            {cta.icon && <cta.icon size={15} />}
          </button>
        )}
        {children}
      </div>
    </motion.section>
  );
}
