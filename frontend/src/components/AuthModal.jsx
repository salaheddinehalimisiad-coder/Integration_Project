import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, Database, Eye, EyeOff, Loader2, ShieldCheck, Sparkles, 
  X, Zap, Users, BarChart3, Wallet, UserRound, Lock, AlertCircle
} from 'lucide-react';
import { api, describeError } from '../lib/api';

const DEMO_ACCOUNTS = [
  { role: 'Administrateur',  user: 'admin',   pass: 'admin123',   icon: ShieldCheck, hue: 'indigo'  },
  { role: 'RH',              user: 'hr',      pass: 'hr123',      icon: Users,       hue: 'emerald' },
  { role: 'Chef de projet',  user: 'project', pass: 'project123', icon: BarChart3,   hue: 'cyan'    },
  { role: 'Finance',         user: 'finance', pass: 'finance123', icon: Wallet,      hue: 'amber'   },
  { role: 'Lecteur',         user: 'viewer',  pass: 'viewer123',  icon: UserRound,   hue: 'slate'   },
];

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDemo, setSelectedDemo] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const fillDemo = (acc) => {
    setSelectedDemo(acc.user);
    setUsername(acc.user);
    setPassword(acc.pass);
    setError('');
  };

  const handleInputChange = (type, val) => {
    if (type === 'user') setUsername(val);
    if (type === 'pwd') setPassword(val);
    setSelectedDemo(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.login({ username, password });
      localStorage.setItem('dm_token', data.token);
      localStorage.setItem('dm_user', JSON.stringify(data));
      onSuccess?.(data);
    } catch (err) {
      if (err.response?.status === 429) {
        const retry = err.response?.headers?.['retry-after'];
        setError(`Trop de tentatives. Réessayez dans ${retry || 'quelques'} seconde(s).`);
      } else {
        setError(describeError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#060810]/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative z-10 w-full max-w-4xl min-h-[500px] flex flex-col md:flex-row rounded-3xl overflow-hidden border border-white/10 bg-[#111525] shadow-2xl"
          >
            {/* Left panel (Branding & Info) */}
            <div className="w-full md:w-[40%] flex-shrink-0 bg-[#181c2f] border-b md:border-b-0 md:border-r border-white/5 p-8 flex flex-col justify-between relative overflow-hidden">
              {/* Glow spots */}
              <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-indigo-600/10 blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-cyan-600/10 blur-[80px] pointer-events-none" />

              <div className="relative z-10">
                {/* Brand Logo */}
                <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Database size={13} className="text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">DataMediator Pro</span>
                </div>

                <h2 className="text-2xl font-black text-white leading-tight mb-3">
                  Fédérez vos bases<br />de données hétérogènes.
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-8">
                  Accédez à un schéma global virtuel unique et résolvez les requêtes locales en temps réel.
                </p>

                {/* Features list */}
                <div className="flex flex-col gap-5">
                  {[
                    { icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/5', border: 'border-indigo-500/10', title: 'Calcul GAV / LAV', desc: 'Traduction automatique des requêtes globales.' },
                    { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/10', title: 'Sécurité RBAC', desc: 'Politiques de sécurité et masquage centralisés.' },
                    { icon: Sparkles, color: 'text-cyan-400', bg: 'bg-cyan-500/5', border: 'border-cyan-500/10', title: 'Entity Resolution', desc: 'Détection et résolution instantanée des conflits.' },
                  ].map(({ icon: Icon, color, bg, border, title, desc }) => (
                    <div key={title} className="flex gap-4 items-start">
                      <div className={`w-8 h-8 rounded-lg ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={14} className={color} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white mb-0.5">{title}</div>
                        <div className="text-[11px] text-slate-400 leading-normal">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="relative z-10 bg-white/2 border border-white/5 rounded-xl p-3 mt-8">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <div className="text-[10px] font-bold text-white uppercase tracking-wider">Médiateur en ligne</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">6 sources connectées & réconciliées</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel (Login Form) */}
            <div className="flex-1 p-8 md:p-12 flex flex-col justify-center relative bg-[#111525]">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all z-20 cursor-pointer"
                title="Fermer"
              >
                <X size={15} />
              </button>

              <div className="max-w-md mx-auto w-full">
                <div className="mb-6">
                  <h3 className="text-xl font-extrabold text-white mb-1.5">Connexion à la Console</h3>
                  <p className="text-xs text-slate-400">Renseignez vos identifiants pour accéder aux outils d'intégration.</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Username Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="modal-user">Identifiant</label>
                    <div className="relative">
                      <input
                        id="modal-user"
                        ref={inputRef}
                        type="text"
                        value={username}
                        onChange={e => handleInputChange('user', e.target.value)}
                        placeholder="admin, hr, project, finance..."
                        disabled={loading}
                        className="w-full h-11 bg-[#060810] border border-white/10 rounded-xl px-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="modal-pwd">Mot de passe</label>
                    <div className="relative">
                      <input
                        id="modal-pwd"
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => handleInputChange('pwd', e.target.value)}
                        placeholder="••••••••"
                        disabled={loading}
                        className="w-full h-11 bg-[#060810] border border-white/10 rounded-xl pl-4 pr-10 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                      >
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Error Box */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium"
                      >
                        <AlertCircle size={14} className="flex-shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-90 font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <>
                        Se connecter
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  <div className="flex-1 h-px bg-white/5" />
                  <span>Comptes de démonstration</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {/* Demo Accounts Selectors Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => {
                    const DemoIcon = acc.icon;
                    const isActive = selectedDemo === acc.user;
                    return (
                      <motion.button
                        key={acc.user}
                        type="button"
                        onClick={() => fillDemo(acc)}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-500/10 border-indigo-500/40 text-white shadow-md'
                            : 'bg-white/2 border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10 hover:text-white'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          acc.hue === 'indigo' ? 'bg-indigo-500/10 text-indigo-400' :
                          acc.hue === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                          acc.hue === 'cyan' ? 'bg-cyan-500/10 text-cyan-400' :
                          acc.hue === 'amber' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>
                          <DemoIcon size={13} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold truncate leading-tight text-white">{acc.role}</div>
                          <div className="text-[8px] font-mono truncate text-slate-500 mt-0.5">{acc.user}</div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
