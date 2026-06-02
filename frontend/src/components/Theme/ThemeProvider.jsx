import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

/**
 * ThemeProvider sets `data-theme="light|dark"` on the document root.
 * All visual tokens are defined in styles/design-system.css; this component
 * does NOT set individual CSS variables — it only switches the theme attribute.
 */
const ThemeProvider = ({ children }) => {
  const getSystem = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('datamediator-theme');
    return saved || getSystem();
  });
  const [systemTheme, setSystemTheme] = useState(getSystem());

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('datamediator-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((p) => (p === 'light' ? 'dark' : 'light'));
  const resetToSystem = () => {
    localStorage.removeItem('datamediator-theme');
    setTheme(systemTheme);
  };

  const value = {
    theme,
    systemTheme,
    toggleTheme,
    setTheme,
    resetToSystem,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isSystem: localStorage.getItem('datamediator-theme') === null,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeProvider;
