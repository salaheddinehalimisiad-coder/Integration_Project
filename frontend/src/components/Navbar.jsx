import { Link, useLocation } from 'react-router-dom';
import { Newspaper, BarChart2, GitMerge, Server, Settings, Search, Box } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

export default function Navbar() {
  const location = useLocation();
  const [mode, setMode] = useState('GAV');

  useEffect(() => {
    axios.get(`${API_URL}/stats`).then(res => setMode(res.data.mode));
  }, []);

  const switchMode = (m) => {
    axios.get(`${API_URL}/mode/${m}`).then(() => {
      setMode(m);
      window.location.reload();
    });
  };

  const links = [
    { name: 'Accueil', path: '/', icon: Newspaper },
    { name: 'Stats', path: '/stats', icon: BarChart2 },
    { name: 'Mappings', path: '/mapping', icon: GitMerge },
    { name: 'Bucket (LAV)', path: '/bucket', icon: Box },
    { name: 'Architecture', path: '/architecture', icon: Server },
    { name: 'Admin', path: '/admin', icon: Settings },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 glass-panel rounded-none border-t-0 border-x-0 bg-surface/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.8)] transition-all">
              N
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">NewsHub</span>
          </Link>

          <nav className="hidden md:flex gap-1">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={clsx(
                    'relative px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 hover:bg-white/5',
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navbar-active"
                      className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/20"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon size={16} className={isActive ? 'text-primary' : ''} />
                  <span className="relative z-10">{link.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex bg-white/5 p-1 rounded-lg border border-white/10 items-center">
              <button 
                onClick={() => switchMode('GAV')}
                className={clsx(
                  "px-3 py-1 text-[10px] font-black rounded transition-all",
                  mode === 'GAV' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                GAV
              </button>
              <button 
                onClick={() => switchMode('LAV')}
                className={clsx(
                  "px-3 py-1 text-[10px] font-black rounded transition-all",
                  mode === 'LAV' ? "bg-secondary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                LAV
              </button>
            </div>
            <button className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <Search size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
