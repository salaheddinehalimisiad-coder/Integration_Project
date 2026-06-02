import { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import './Input.css';

const Input = forwardRef(({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  error,
  success,
  disabled = false,
  required = false,
  icon,
  showPasswordToggle = false,
  className = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const hasIcon = icon || showPasswordToggle || error || success;

  const baseClasses = 'input';
  const stateClasses = [
    error ? 'input-error' : '',
    success ? 'input-success' : '',
    disabled ? 'input-disabled' : '',
    isFocused ? 'input-focused' : '',
    hasIcon ? 'input-with-icon' : ''
  ].filter(Boolean).join(' ');

  const wrapperClasses = [
    'input-wrapper',
    error ? 'input-wrapper-error' : '',
    success ? 'input-wrapper-success' : ''
  ].filter(Boolean).join(' ');

  const renderIcon = () => {
    if (error) {
      return <AlertCircle size={18} className="input-icon-error" />;
    }
    if (success) {
      return <CheckCircle size={18} className="input-icon-success" />;
    }
    if (showPasswordToggle && type === 'password') {
      return (
        <button
          type="button"
          className="input-password-toggle"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      );
    }
    if (icon) {
      return <span className="input-icon">{icon}</span>;
    }
    return null;
  };

  return (
    <div className="input-container">
      {label && (
        <label className={`input-label ${required ? 'input-label-required' : ''}`}>
          {label}
        </label>
      )}
      
      <div className={wrapperClasses}>
        <motion.input
          ref={ref}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`${baseClasses} ${stateClasses} ${className}`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          whileFocus={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          {...props}
        />
        {renderIcon()}
      </div>
      
      {error && (
        <motion.div
          className="input-error-message"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {error}
        </motion.div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
