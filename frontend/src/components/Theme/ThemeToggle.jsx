import { useTheme } from './ThemeProvider';
import { Moon, Sun, Monitor } from 'lucide-react';
import './ThemeToggle.css';

const ThemeToggle = ({ variant = 'button' }) => {
  const { theme, systemTheme, toggleTheme, resetToSystem, isSystem } = useTheme();

  const getIcon = () => {
    if (theme === 'dark') return <Moon size={16} />;
    if (theme === 'light') return <Sun size={16} />;
    return <Monitor size={16} />;
  };

  const getLabel = () => {
    if (theme === 'dark') return 'Mode sombre';
    if (theme === 'light') return 'Mode clair';
    return 'Mode système';
  };

  if (variant === 'dropdown') {
    return (
      <div className="theme-dropdown">
        <button className="theme-dropdown-trigger">
          {getIcon()}
          <span>{getLabel()}</span>
        </button>
        <div className="theme-dropdown-menu">
          <button
            className={`theme-option ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
          >
            <Sun size={16} />
            <span>Clair</span>
          </button>
          <button
            className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            <Moon size={16} />
            <span>Sombre</span>
          </button>
          <button
            className={`theme-option ${isSystem ? 'active' : ''}`}
            onClick={resetToSystem}
          >
            <Monitor size={16} />
            <span>Système</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={`Basculer vers le mode ${theme === 'dark' ? 'clair' : 'sombre'}`}
      aria-label={`Basculer vers le mode ${theme === 'dark' ? 'clair' : 'sombre'}`}
    >
      {getIcon()}
      <span className="theme-toggle-label">{getLabel()}</span>
    </button>
  );
};

export default ThemeToggle;
