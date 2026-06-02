import { motion } from 'framer-motion';
import './Card.css';

const Card = ({ 
  children, 
  variant = 'default', 
  padding = 'md', 
  shadow = 'md',
  hover = false,
  className = '',
  onClick,
  ...props 
}) => {
  const baseClasses = 'card';
  const variantClasses = `card-${variant}`;
  const paddingClasses = `card-padding-${padding}`;
  const shadowClasses = `card-shadow-${shadow}`;
  const hoverClasses = hover ? 'card-hover' : '';
  
  const classes = [
    baseClasses,
    variantClasses,
    paddingClasses,
    shadowClasses,
    hoverClasses,
    className
  ].filter(Boolean).join(' ');

  const MotionComponent = onClick ? motion.div : 'div';
  const motionProps = onClick ? {
    whileHover: { scale: 1.02, y: -2 },
    whileTap: { scale: 0.98 },
    transition: { type: "spring", stiffness: 400, damping: 17 }
  } : {};

  return (
    <MotionComponent
      className={classes}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </MotionComponent>
  );
};

export default Card;
