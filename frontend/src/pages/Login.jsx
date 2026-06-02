import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, describeError } from '../lib/api';
import { useTheme } from '../components/Theme/ThemeProvider';
import {
  Database, Eye, EyeOff, ArrowRight, Shield, AlertCircle,
  Users, BarChart3, Wallet, UserRound, Layers3, Network, Lock,
  Sparkles, Zap, CheckCircle2, GitBranch, Search, Waves, Code2,
  PlayCircle, BrainCircuit, Blocks, ArrowUpRight, Rocket, Terminal,
  Globe, HardDrive, Cpu, ShieldCheck, ChevronDown, ChevronUp, Clock,
  Menu, X, Table, FileJson, Server, Sun, Moon
} from 'lucide-react';
import SEO from '../components/SEO/SEO';
import AnimatedCounter from '../components/UI/AnimatedCounter';
import AnimatedIcon from '../components/UI/AnimatedIcon';
import './Login.css';

/* ── Animation variants ── */
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
};

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const DEMO_ACCOUNTS = [
  { role: 'Administrateur',  user: 'admin',   pass: 'admin123',   icon: Shield,    hue: 'brand'   },
  { role: 'RH',              user: 'hr',      pass: 'hr123',      icon: Users,     hue: 'info'    },
  { role: 'Chef de projet',  user: 'project', pass: 'project123', icon: BarChart3, hue: 'success' },
  { role: 'Finance',         user: 'finance', pass: 'finance123', icon: Wallet,    hue: 'warning' },
  { role: 'Lecteur',         user: 'viewer',  pass: 'viewer123',  icon: UserRound, hue: 'neutral' },
];

const FAQS = [
  {
    q: 'Comment fonctionne la médiation de données hétérogènes ?',
    a: 'DataMediator ne duplique pas vos données physiques dans un entrepôt centralisé. Il maintient un schéma global virtuel unique. Lorsque vous formulez une requête SQL ou GraphQL globale, le médiateur la traduit automatiquement en sous-requêtes locales ciblant chaque source physique (Postgres, MySQL, MongoDB, Neo4j, XML, CSV), les exécute en parallèle, résout les conflits sémantiques et fusionne les résultats au vol.'
  },
  {
    q: 'Quelle est la différence entre les approches GAV et LAV ?',
    a: 'Dans la médiation GAV (Global-As-View), le schéma global virtuel est modélisé comme une collection de vues sur les sources physiques locales. C\'est parfait pour les schémas d\'intégration stables. Dans l\'approche LAV (Local-As-View), les sources physiques sont modélisées comme des vues sur le schéma global virtuel. C\'est la solution idéale pour ajouter ou supprimer dynamiquement des sources de données locales sans restructurer le modèle global.'
  },
  {
    q: 'Comment le système gère-t-il la résolution des conflits d\'entités ?',
    a: 'L\'Entity Resolution Engine détecte les entités dupliquées entre plusieurs systèmes (par exemple, un employé présent à la fois dans le module RH Postgres et dans le suivi de projets MongoDB). Il applique des règles de fusion basées sur des ordres de priorités paramétrables (ex: privilégier Postgres pour les salaires, MySQL pour les emails) pour fournir un résultat réconcilié exempt de doublons.'
  },
  {
    q: 'Où est appliquée la politique de sécurité d\'accès aux données ?',
    a: 'La sécurité est centralisée au niveau du médiateur (contrôle d\'accès RBAC). Avant d\'exécuter ou de réécrire la requête sur les bases physiques, le médiateur filtre les tables et colonnes sensibles selon le rôle applicatif de l\'utilisateur connecté (ex: le salaire est masqué pour le rôle chef de projet). Cela évite de devoir configurer 6 politiques de sécurité complexes et hétérogènes sur chaque base physique.'
  },
  {
    q: 'Quels connecteurs sont configurés par défaut dans DataMediator Pro ?',
    a: 'Le projet intègre nativement 6 connecteurs distincts fonctionnant de concert : PostgreSQL (Bases RH), MySQL (Finances), MongoDB (Suivi Projets), Neo4j (Graphes de dépendances), API XML (Métadonnées) et fichiers CSV Legacy (Données historiques).'
  }
];

const ENGINE_COMPONENTS = {
  decomposer: {
    icon: Layers3, title: 'Décomposeur GAV & LAV',
    desc: 'Analyse la requête globale virtuelle formulée par l\'utilisateur et la décompose en sous-requêtes élémentaires de réécriture basées sur les règles de correspondances globales et locales.',
    color: 'text-emerald-500', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)'
  },
  rewriter: {
    icon: Network, title: 'Moteur de Réécriture (Bucket/MiniCon)',
    desc: 'Algorithme de pointe traduisant les requêtes globales virtuelles en requêtes sources physiques optimales, résolvant les vues LAV et minimisant la charge d\'exécution locale.',
    color: 'text-indigo-500', bg: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.2)'
  },
  executor: {
    icon: Cpu, title: 'Exécuteur Distribué',
    desc: 'Distribue et coordonne l\'exécution des sous-requêtes en parallèle sur PostgreSQL, MySQL, MongoDB, Neo4j, XML et CSV, puis assemble les jeux de résultats de manière synchrone.',
    color: 'text-cyan-500', bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.2)'
  },
  resolver: {
    icon: GitBranch, title: 'Résolveur de Conflits d\'Entités',
    desc: 'Réconcilie les doublons sémantiques entre les bases en appliquant des stratégies de fusion (priorité de source, valeurs par défaut, élimination des conflits).',
    color: 'text-purple-500', bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.2)'
  },
  security: {
    icon: Lock, title: 'Garde Sécurité RBAC',
    desc: 'Intercepte les requêtes globales pour masquer les colonnes ou interdire l\'accès à certaines tables selon le rôle utilisateur (admin, finance, hr, pm, viewer).',
    color: 'text-rose-500', bg: 'rgba(244, 63, 94, 0.08)', border: 'rgba(244, 63, 94, 0.2)'
  }
};

export default function Login({ onLogin }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState('decomposer');
  const [isPaused, setIsPaused] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Login form states
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const userRef = useRef(null);

  const { theme, toggleTheme, isDark } = useTheme();

  useEffect(() => {
    if (isPaused) return;
    const keys = Object.keys(ENGINE_COMPONENTS);
    const interval = setInterval(() => {
      setActiveTab(prev => {
        const currentIndex = keys.indexOf(prev);
        return keys[(currentIndex + 1) % keys.length];
      });
    }, 5500);
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    if (showLoginModal) {
      const t = setTimeout(() => userRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [showLoginModal]);

  const onChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (error) setError('');
    setSelected(null);
  };

  const fillDemo = (acc) => {
    setSelected(acc.user);
    setForm({ username: acc.user, password: acc.pass });
    if (error) setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Identifiant et mot de passe requis.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.login(form);
      localStorage.setItem('dm_token', data.token);
      localStorage.setItem('dm_user', JSON.stringify(data));
      onLogin(data);
    } catch (err) {
      if (err.response?.status === 429) {
        const retry = err.response?.headers?.['retry-after'];
        setError(`Trop de tentatives. Reessayez dans ${retry || 'quelques'} seconde(s).`);
      } else {
        setError(describeError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  return (
    <>
      <SEO title="DataMediator Pro — Médiation Intelligente de Données" 
           description="Fédérez vos bases de données hétérogènes en temps réel sous un schéma virtuel global" />
      
      <div className="relative w-full min-h-screen flex flex-col items-center overflow-x-hidden font-sans" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        
        {/* ── BACKGROUND ORBS ── */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[180px]"></div>
          <div className="absolute top-[30%] right-[5%] w-[40%] h-[40%] rounded-full bg-pink-500/5 blur-[160px]"></div>
          <div className="absolute bottom-[0%] left-[30%] w-[35%] h-[35%] rounded-full bg-cyan-500/5 blur-[140px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40 [mask-image:radial-gradient(ellipse_80%_100%_at_50%_0%,#000_20%,transparent_100%)]"></div>
        </div>

        {/* ── NAVIGATION BAR ── */}
        <nav className="fixed top-0 inset-x-0 z-[100] w-full border-b backdrop-blur-xl transition-all duration-300" style={{ background: 'rgba(11, 15, 30, 0.8)', borderColor: 'rgba(255, 255, 255, 0.06)' }}>
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                  <path d="M16 3L27 9L16 15L5 9L16 3Z" fill="#6366f1"/>
                  <path d="M16 10L27 16L16 22L5 16L16 10Z" fill="#ec4899"/>
                  <path d="M16 17L27 23L16 29L5 23L16 17Z" fill="#06b6d4"/>
                </svg>
              </div>
              <div>
                <span className="font-extrabold text-lg text-white tracking-tight">DataMediator</span>
                <span className="block text-[8px] text-indigo-400 font-bold uppercase tracking-widest leading-none">PRO</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-300">
              <button onClick={(e) => scrollToSection(e, 'platform')} className="hover:text-indigo-400 transition-colors cursor-pointer">Moteur de médiation</button>
              <button onClick={(e) => scrollToSection(e, 'architecture')} className="hover:text-indigo-400 transition-colors cursor-pointer">Architecture 3D</button>
              <button onClick={(e) => scrollToSection(e, 'integrations')} className="hover:text-indigo-400 transition-colors cursor-pointer">Sources supportées</button>
              <button onClick={(e) => scrollToSection(e, 'faq')} className="hover:text-indigo-400 transition-colors cursor-pointer">FAQ</button>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme} 
                className="p-2.5 rounded-xl border transition-all duration-300 hover:scale-105" 
                style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.08)', color: isDark ? '#fbbf24' : '#6366f1' }}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              
              <button 
                onClick={() => setShowLoginModal(true)} 
                className="hidden sm:block text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Se connecter
              </button>
              
              <button 
                onClick={() => setShowLoginModal(true)} 
                className="text-sm font-bold text-white px-5 py-2.5 rounded-full hover:opacity-90 transition-all active:scale-95 shadow-md cursor-pointer" 
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', boxShadow: '0 4px 15px rgba(99,102,241,0.3)' }}
              >
                Accéder au Dashboard
              </button>

              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 rounded-lg text-slate-400">
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                className="lg:hidden overflow-hidden border-t" 
                style={{ borderColor: 'rgba(255, 255, 255, 0.06)', background: 'rgba(11, 15, 30, 0.95)' }}
              >
                <div className="px-6 py-4 flex flex-col gap-3 text-sm font-semibold text-slate-300">
                  <button className="text-left" onClick={(e) => scrollToSection(e, 'platform')}>Moteur de médiation</button>
                  <button className="text-left" onClick={(e) => scrollToSection(e, 'architecture')}>Architecture 3D</button>
                  <button className="text-left" onClick={(e) => scrollToSection(e, 'integrations')}>Sources supportées</button>
                  <button className="text-left" onClick={(e) => scrollToSection(e, 'faq')}>FAQ</button>
                  <button className="text-left border-t pt-2 border-white/5 text-indigo-400" onClick={() => { setMobileMenuOpen(false); setShowLoginModal(true); }}>Se connecter</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ── HERO SECTION ── */}
        <header className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-36 pb-16 md:pt-48 md:pb-24 flex flex-col items-center">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="w-full flex flex-col items-center text-center">
            
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-white/5 border-white/10 text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-6 backdrop-blur-md">
              <Sparkles size={12} className="text-indigo-400" /> PROJET ACADÉMIQUE — MASTER INTÉGRATION DE DONNÉES
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 max-w-5xl text-white">
              Une seule requête SQL.
              <br />
              <span className="bg-gradient-to-r from-indigo-200 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Six sources hétérogènes intégrées.
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-lg md:text-xl max-w-3xl mb-10 font-medium leading-relaxed text-slate-300">
              Interrogez votre schéma global virtuel comme une base unique. Notre médiateur prend en charge la réécriture de requêtes locale, l'exécution distribuée, la réconciliation d'entités sémantiques et la sécurité RBAC à la volée.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center mb-16">
              <button 
                onClick={() => setShowLoginModal(true)} 
                className="group relative flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 text-white rounded-2xl font-bold text-lg transition-all active:scale-[0.98] cursor-pointer hover:shadow-[0_8px_25px_rgba(99,102,241,0.4)]" 
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)' }}
              >
                <Database size={20} className="text-white/80" />
                Démarrer la Console
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => {
                  const el = document.getElementById('platform');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }} 
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-lg transition-all active:scale-[0.98] border border-white/10 text-white bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <PlayCircle size={20} className="text-slate-400" /> Explorer la plateforme
              </button>
            </motion.div>
          </motion.div>
        </header>

        {/* ── STATS SECTION ── */}
        <section className="relative z-10 w-full py-16 border-y border-white/5" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 6, label: 'sources hétérogènes', icon: Database },
              { value: 5, label: 'relations globales', icon: Network },
              { value: 9, label: 'vues LAV définies', icon: Layers3 },
              { value: 8, label: 'conflits résolus', icon: GitBranch }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-indigo-200 to-pink-400 bg-clip-text text-transparent mb-2">
                  <AnimatedCounter value={stat.value} duration={1200} />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PLATFORM ORCHESTRATION SLIDESHOW ── */}
        <section id="platform" className="relative z-10 w-full py-24 md:py-32 border-b border-white/5" style={{ scrollMarginTop: '80px' }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5 text-white">Le Cœur du Médiateur</h2>
              <p className="text-lg max-w-2xl mx-auto leading-relaxed text-slate-400">
                DataMediator intègre 5 composants clés pour décomposer, traduire, exécuter et sécuriser vos requêtes au vol.
              </p>
            </motion.div>

            <div className="flex flex-col lg:flex-row items-center gap-12 max-w-5xl mx-auto">
              {/* Slideshow Details Card (Left) */}
              <div className="w-full lg:w-1/2 flex flex-col gap-4">
                {Object.entries(ENGINE_COMPONENTS).map(([key, comp]) => {
                  const Icon = comp.icon;
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => { setActiveTab(key); setIsPaused(true); }}
                      className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                        isActive 
                          ? 'bg-white/5 border-indigo-500/40 shadow-[0_4px_20px_rgba(99,102,241,0.1)]' 
                          : 'bg-transparent border-transparent hover:bg-white/2 hover:border-white/5'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${comp.bg}`} style={{ border: `1px solid ${comp.border}` }}>
                        <Icon size={20} className={comp.color} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white mb-1">{comp.title}</h3>
                        {isActive && (
                          <motion.p 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            className="text-xs text-slate-300 mt-2 leading-relaxed"
                          >
                            {comp.desc}
                          </motion.p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Interactive Slide Graphic (Right) */}
              <div 
                onMouseEnter={() => setIsPaused(true)} 
                onMouseLeave={() => setIsPaused(false)} 
                className="w-full lg:w-1/2 h-[380px] rounded-[32px] border p-8 relative flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-500 border-white/5" 
                style={{ background: 'rgba(10, 15, 30, 0.4)', borderColor: 'rgba(255, 255, 255, 0.08)' }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.04)_0,transparent_75%)] pointer-events-none"></div>

                <AnimatePresence mode="wait">
                  {activeTab === 'decomposer' && (
                    <motion.div key="decomposer" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full h-full flex flex-col items-center justify-center text-center">
                      <Layers3 size={80} className="text-emerald-500/20 mb-8 animate-pulse" />
                      <div className="flex gap-4 mb-8">
                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-emerald-400">Global Query</div>
                        <div className="flex items-center text-white/40"><ArrowRight size={14} /></div>
                        <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300">Local Queries</div>
                      </div>
                      <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-widest">GAV / LAV DECOMPOSITION</span>
                    </motion.div>
                  )}

                  {activeTab === 'rewriter' && (
                    <motion.div key="rewriter" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full h-full flex flex-col items-center justify-center text-center">
                      <Network size={80} className="text-indigo-500/20 mb-8" />
                      <div className="grid grid-cols-3 gap-6 items-center max-w-sm">
                        <div className="px-3 py-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-[10px] font-mono text-indigo-300">Bucket Algorithm</div>
                        <div className="px-3 py-4 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">Minicon Plan</div>
                        <div className="px-3 py-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-[10px] font-mono text-indigo-300">Inverse Rules</div>
                      </div>
                      <span className="font-mono text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-8">QUERY REWRITING MODULE</span>
                    </motion.div>
                  )}

                  {activeTab === 'executor' && (
                    <motion.div key="executor" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full h-full flex flex-col items-center justify-center text-center">
                      <Cpu size={80} className="text-cyan-500/20 mb-8" />
                      <div className="flex gap-4 justify-center">
                        {[Server, FileJson, Table].map((Ic, idx) => (
                          <motion.div 
                            key={idx} 
                            animate={{ y: [0, -10, 0] }} 
                            transition={{ duration: 2.2, delay: idx * 0.3, repeat: Infinity }} 
                            className="w-14 h-14 rounded-2xl bg-cyan-500/5 border border-cyan-500/25 flex items-center justify-center"
                          >
                            <Ic size={24} className="text-cyan-400" />
                          </motion.div>
                        ))}
                      </div>
                      <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-8">PARALLEL THREAD EXECUTION</span>
                    </motion.div>
                  )}

                  {activeTab === 'resolver' && (
                    <motion.div key="resolver" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full h-full flex flex-col items-center justify-center text-center">
                      <GitBranch size={80} className="text-purple-500/20 mb-8" />
                      <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 max-w-xs text-left">
                        <div className="text-[10px] font-mono text-purple-400 mb-2">{">> Entity Conflict Detected"}</div>
                        <div className="text-[10px] font-mono text-slate-300">Resolved via priority mapping :</div>
                        <div className="text-[10px] font-mono text-emerald-400 font-bold mt-1">{"✓ emp_id 101 -> PostgreSQL Source"}</div>
                      </div>
                      <span className="font-mono text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-6">CONFLICT RESOLUTION CORE</span>
                    </motion.div>
                  )}

                  {activeTab === 'security' && (
                    <motion.div key="security" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full h-full flex flex-col items-center justify-center text-center">
                      <Lock size={80} className="text-rose-500/20 mb-8 animate-bounce" />
                      <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/25 flex items-center gap-3">
                        <ShieldCheck size={20} className="text-rose-400" />
                        <span className="font-mono text-xs text-rose-300">{"Col: salary -> FILTERED (Role: pm)"}</span>
                      </div>
                      <span className="font-mono text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-8">ROLE SECURITY INTERCEPTOR</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3D ARCHITECTURE STACK VISUAL ── */}
        <section id="architecture" className="relative z-10 w-full py-24 md:py-32 border-b border-white/5" style={{ scrollMarginTop: '80px' }}>
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 text-white">Visualisation de l'intégration</h2>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                Notre architecture isométrique montre comment vos sources de données physiques (SQL, NoSQL, Graphes, API) sont fédérées à travers le moteur de médiation distribué pour exposer une interface client unique.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 font-bold text-sm shrink-0">1</div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Schéma global virtuel (Client)</h3>
                    <p className="text-xs text-slate-400">Le client formule des requêtes SQL/GraphQL sans se soucier de l'emplacement ou du format des données.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">2</div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Médiateur de données</h3>
                    <p className="text-xs text-slate-400">Gère la décomposition, réécrit les requêtes, résout les conflits sémantiques et applique les règles de sécurité RBAC.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">3</div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Sources physiques locales</h3>
                    <p className="text-xs text-slate-400">Vos 6 bases hétérogènes (PostgreSQL, MySQL, MongoDB, Neo4j, XML, CSV) s'exécutent en arrière-plan sans modification de structure.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Render 3D stack illustration */}
            <div className="flex justify-center items-center">
              <svg className="dashboard-mockup scale-110" viewBox="0 0 450 350" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="225" cy="175" r="130" fill="url(#mockup-radial-glow)" opacity="0.3" filter="blur(50px)" />
                <defs>
                  <radialGradient id="mockup-radial-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                  
                  <linearGradient id="card-mesh" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(25, 33, 56, 0.85)" />
                    <stop offset="100%" stopColor="rgba(10, 15, 30, 0.55)" />
                  </linearGradient>
                </defs>

                <g className="mockup-stack">
                  {/* BOTTOM LAYER */}
                  <g className="mockup-layer mockup-layer--bottom">
                    <rect x="20" y="160" width="280" height="150" rx="12" fill="url(#card-mesh)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1.2" />
                    <text x="35" y="182" fill="rgba(255, 255, 255, 0.6)" fontSize="10" fontWeight="700" letterSpacing="0.05em">HETEROGENEOUS SOURCES (6)</text>
                    
                    <g transform="translate(35, 195)">
                      <rect x="0" y="0" width="70" height="30" rx="6" fill="rgba(59, 130, 246, 0.1)" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1" />
                      <text x="35" y="18" fill="#93c5fd" fontSize="9" fontWeight="600" textAnchor="middle">PostgreSQL</text>
                      
                      <rect x="80" y="0" width="70" height="30" rx="6" fill="rgba(245, 158, 11, 0.1)" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="1" />
                      <text x="115" y="18" fill="#fde047" fontSize="9" fontWeight="600" textAnchor="middle">MySQL</text>

                      <rect x="160" y="0" width="70" height="30" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" />
                      <text x="195" y="18" fill="#6ee7b7" fontSize="9" fontWeight="600" textAnchor="middle">MongoDB</text>

                      <rect x="0" y="40" width="70" height="30" rx="6" fill="rgba(168, 85, 247, 0.1)" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="1" />
                      <text x="35" y="58" fill="#d8b4fe" fontSize="9" fontWeight="600" textAnchor="middle">XML API</text>

                      <rect x="80" y="40" width="70" height="30" rx="6" fill="rgba(6, 182, 212, 0.1)" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="1" />
                      <text x="115" y="58" fill="#67e8f9" fontSize="9" fontWeight="600" textAnchor="middle">Neo4j Graph</text>

                      <rect x="160" y="40" width="70" height="30" rx="6" fill="rgba(148, 163, 184, 0.1)" stroke="rgba(148, 163, 184, 0.3)" strokeWidth="1" />
                      <text x="195" y="58" fill="#cbd5e1" fontSize="9" fontWeight="600" textAnchor="middle">CSV File</text>
                    </g>
                  </g>

                  {/* MIDDLE LAYER */}
                  <g className="mockup-layer mockup-layer--middle">
                    <rect x="60" y="90" width="280" height="150" rx="12" fill="url(#card-mesh)" stroke="rgba(99, 102, 241, 0.28)" strokeWidth="1.2" style={{ backdropFilter: "blur(4px)" }} />
                    <text x="75" y="112" fill="#818cf8" fontSize="10" fontWeight="700" letterSpacing="0.05em">MEDIATION ENGINE (DAG)</text>
                    
                    <g transform="translate(80, 130)">
                      <rect x="70" y="0" width="100" height="22" rx="5" fill="rgba(99, 102, 241, 0.18)" stroke="#6366f1" strokeWidth="1.2" />
                      <text x="120" y="14" fill="#c7d2fe" fontSize="8" fontWeight="600" textAnchor="middle">Global Schema Query</text>

                      <path d="M120 22 L85 45 M120 22 L155 45" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />

                      <rect x="30" y="45" width="85" height="22" rx="5" fill="rgba(236, 72, 153, 0.15)" stroke="#ec4899" strokeWidth="1.2" />
                      <text x="72" y="59" fill="#fbcfe8" fontSize="8" fontWeight="600" textAnchor="middle">GAV Rule Decomp</text>

                      <rect x="125" y="45" width="85" height="22" rx="5" fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" strokeWidth="1.2" />
                      <text x="167" y="59" fill="#a5f3fc" fontSize="8" fontWeight="600" textAnchor="middle">LAV Bucket / MiniCon</text>

                      <path d="M72 67 L120 90 M167 67 L120 90" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />

                      <rect x="70" y="90" width="100" height="22" rx="5" fill="rgba(16, 185, 129, 0.18)" stroke="#10b981" strokeWidth="1.2" />
                      <text x="120" y="104" fill="#a7f3d0" fontSize="8" fontWeight="600" textAnchor="middle">Entity Resolution</text>
                    </g>
                  </g>

                  {/* TOP LAYER */}
                  <g className="mockup-layer mockup-layer--top">
                    <rect x="100" y="20" width="280" height="150" rx="12" fill="url(#card-mesh)" stroke="rgba(236, 72, 153, 0.28)" strokeWidth="1.2" style={{ backdropFilter: "blur(8px)" }} />
                    <text x="115" y="42" fill="#ec4899" fontSize="10" fontWeight="700" letterSpacing="0.05em">UNIFIED API CLIENT</text>

                    <g transform="translate(115, 55)">
                      <rect x="0" y="0" width="115" height="85" rx="5" fill="rgba(15, 23, 42, 0.7)" stroke="rgba(255,255,255,0.06)" />
                      <text x="10" y="15" fill="#f43f5e" fontSize="7" fontFamily="monospace">{"query Integration {"}</text>
                      <text x="20" y="27" fill="#6366f1" fontSize="7" fontFamily="monospace">{"  employee(id: 101) {"}</text>
                      <text x="30" y="39" fill="#94a3b8" fontSize="7" fontFamily="monospace">    name</text>
                      <text x="30" y="51" fill="#94a3b8" fontSize="7" fontFamily="monospace">    salary</text>
                      <text x="30" y="63" fill="#10b981" fontSize="7" fontFamily="monospace">    projects</text>
                      <text x="20" y="75" fill="#f43f5e" fontSize="7" fontFamily="monospace">  {"}"}</text>
                      <text x="10" y="87" fill="#f43f5e" fontSize="7" fontFamily="monospace">{"}"}</text>

                      <rect x="125" y="0" width="120" height="85" rx="5" fill="rgba(15, 23, 42, 0.7)" stroke="rgba(255,255,255,0.06)" />
                      <text x="135" y="15" fill="#10b981" fontSize="7" fontFamily="monospace">{"{"}</text>
                      <text x="145" y="27" fill="#a855f7" fontSize="7" fontFamily="monospace">{"  \"data\": {"}</text>
                      <text x="155" y="39" fill="#3b82f6" fontSize="7" fontFamily="monospace">    "name": "Salah",</text>
                      <text x="155" y="51" fill="#3b82f6" fontSize="7" fontFamily="monospace">    "salary": 78000,</text>
                      <text x="155" y="63" fill="#a5f3fc" fontSize="7" fontFamily="monospace">    "sources": 6</text>
                      <text x="145" y="75" fill="#a855f7" fontSize="7" fontFamily="monospace">{"  }"}</text>
                      <text x="135" y="87" fill="#10b981" fontSize="7" fontFamily="monospace">{"}"}</text>
                    </g>
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* ── BEFORE / AFTER COMPARATIVE ── */}
        <section className="relative z-10 w-full py-24 md:py-32 border-b border-white/5" style={{ background: 'rgba(255,255,255,0.005)' }}>
          <div className="max-w-6xl mx-auto px-6">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5 text-white">Fédération Virtuelle vs Intégration Classique</h2>
              <p className="text-lg max-w-2xl mx-auto text-slate-400">Voyez la différence de complexité au quotidien pour vos ingénieurs de données.</p>
            </motion.div>

            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* BEFORE */}
              <motion.div variants={slideInLeft} className="rounded-[28px] border p-8 bg-slate-900/40 border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20">
                    <Clock size={20} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Intégration classique (ETL/Data Warehouse)</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Sources physiques distinctes', val: '6 protocoles & formats à coder' },
                    { label: 'Structure du schéma', val: 'Rigide et répliquée localement' },
                    { label: 'Traitement des requêtes', val: 'Manuel ou synchronisation par batchs' },
                    { label: 'Sécurité RBAC', val: 'Configurée séparément sur 6 bases' },
                    { label: 'Gestion des doublons', val: 'Scripts complexes de nettoyage post-chargement' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/2">
                      <span className="text-sm font-medium text-slate-400">{item.label}</span>
                      <span className="text-sm font-bold text-red-400">{item.val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* AFTER */}
              <motion.div variants={slideInRight} className="rounded-[28px] border p-8 bg-indigo-500/2 border-indigo-500/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.04)_0,transparent_50%)]"></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                    <Zap size={20} className="text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Avec DataMediator Pro</h3>
                </div>
                <div className="space-y-4 relative z-10">
                  {[
                    { label: 'Sources physiques distinctes', val: 'Interface SQL virtuelle unique', highlight: true },
                    { label: 'Structure du schéma', val: 'Dynamique (GAV/LAV en temps réel)', highlight: true },
                    { label: 'Traitement des requêtes', val: 'Traduction automatique à l\'exécution', highlight: true },
                    { label: 'Sécurité RBAC', val: 'Centralisée au niveau du médiateur', highlight: true },
                    { label: 'Gestion des doublons', val: 'Entity Resolution Engine instantané', highlight: true },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border bg-white/2" style={{ borderColor: item.highlight ? 'rgba(16,185,129,0.1)' : 'transparent' }}>
                      <span className="text-sm font-medium text-slate-400">{item.label}</span>
                      <span className="text-sm font-bold text-emerald-400">{item.val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── INTEGRATIONS GRID ── */}
        <section id="integrations" className="relative z-10 w-full py-24 md:py-32 border-b border-white/5" style={{ scrollMarginTop: '80px' }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5 text-white">Sources Fédérées Nativement</h2>
              <p className="text-lg max-w-2xl mx-auto text-slate-400">
                DataMediator Pro s'interface sans aucun agent local avec 6 formats de données structurés et semi-structurés.
              </p>
            </motion.div>

            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
              {[
                { icon: Database, label: 'PostgreSQL', kind: 'SQL local view', color: 'text-indigo-400', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.15)' },
                { icon: Server, label: 'MySQL', kind: 'SQL local view', color: 'text-amber-400', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)' },
                { icon: FileJson, label: 'MongoDB', kind: 'NoSQL Collection', color: 'text-emerald-400', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)' },
                { icon: Network, label: 'Neo4j Graph', kind: 'JSON Graph network', color: 'text-cyan-400', bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.15)' },
                { icon: Code2, label: 'XML API', kind: 'Structured Endpoint', color: 'text-purple-400', bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.15)' },
                { icon: Table, label: 'CSV File', kind: 'Flat database', color: 'text-slate-400', bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.15)' }
              ].map((src, i) => {
                const Icon = src.icon;
                return (
                  <motion.div
                    key={i}
                    variants={scaleIn}
                    whileHover={{ scale: 1.05, y: -4 }}
                    className="flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all text-center"
                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255, 255, 255, 0.06)' }}
                  >
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border" style={{ backgroundColor: src.bg, borderColor: src.border }}>
                      <Icon size={24} className={src.color} />
                    </div>
                    <div>
                      <span className="block font-bold text-sm text-white">{src.label}</span>
                      <span className="block text-[10px] text-slate-400 mt-1">{src.kind}</span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── FAQ SECTION ── */}
        <section id="faq" className="relative z-10 w-full py-24 md:py-32" style={{ scrollMarginTop: '80px' }}>
          <div className="max-w-4xl mx-auto px-6">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5 text-white">Questions Fréquentes</h2>
              <p className="text-lg text-slate-400">Tout savoir sur le moteur de médiation DataMediator Pro.</p>
            </motion.div>

            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <div key={i} className="rounded-2xl border border-white/5 overflow-hidden transition-colors" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left text-base font-bold text-white hover:bg-white/2 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {openFaq === i ? <ChevronUp size={18} className="text-indigo-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-6 pb-6 pt-2 text-sm text-slate-300 leading-relaxed border-t border-white/2">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="relative z-10 w-full py-12 border-t border-white/5 bg-slate-950/20 text-center">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                <path d="M16 3L27 9L16 15L5 9L16 3Z" fill="#6366f1"/>
                <path d="M16 10L27 16L16 22L5 16L16 10Z" fill="#ec4899"/>
                <path d="M16 17L27 23L16 29L5 23L16 17Z" fill="#06b6d4"/>
              </svg>
              <span className="font-extrabold text-sm text-white tracking-tight">DataMediator Pro</span>
            </div>
            <p className="text-xs text-slate-400">&copy; 2026 Projet Académique. Master Intégration de Données. Soutenance ready.</p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              <Zap size={12} className="text-indigo-400" /> JWT — Bcrypt — RBAC Secured
            </div>
          </div>
        </footer>

        {/* ── AUTH LOGIN MODAL ── */}
        <AnimatePresence>
          {showLoginModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLoginModal(false)}
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
              />

              {/* Login Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-[480px]"
              >
                <div className="login-portal-card relative">
                  
                  {/* Close button */}
                  <button 
                    onClick={() => setShowLoginModal(false)} 
                    className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all z-20 cursor-pointer"
                    title="Fermer"
                  >
                    <X size={18} />
                  </button>

                  <header className="login-portal-card__header">
                    <div className="login-portal-card__badge">
                      <CheckCircle2 size={11} /> Connexion sécurisée
                    </div>
                    <h2 className="login-portal-card__title">Bienvenue</h2>
                    <p className="login-portal-card__subtitle">
                      Identifiez-vous pour accéder à la console de médiation.
                    </p>
                  </header>

                  <form onSubmit={submit} className="login-form" noValidate>
                    <div className="ds-field">
                      <label className="ds-field__label" htmlFor="login-user">Identifiant</label>
                      <div className="login-input-wrapper">
                        <UserRound size={16} className="login-input-icon" />
                        <input
                          id="login-user"
                          ref={userRef}
                          className="ds-input login-input-with-icon"
                          type="text"
                          autoComplete="username"
                          placeholder="admin, hr, project, finance, viewer..."
                          value={form.username}
                          onChange={onChange('username')}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="ds-field">
                      <label className="ds-field__label" htmlFor="login-pwd">Mot de passe</label>
                      <div className="login-input-wrapper">
                        <Lock size={16} className="login-input-icon" />
                        <div className="ds-input-wrap login-input-wrap-with-icon">
                          <input
                            id="login-pwd"
                            className="ds-input"
                            type={showPwd ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="********"
                            value={form.password}
                            onChange={onChange('password')}
                            disabled={loading}
                          />
                          <button
                            type="button"
                            className="ds-input-wrap__addon"
                            onClick={() => setShowPwd((v) => !v)}
                            aria-label={showPwd ? 'Masquer' : 'Afficher'}
                            tabIndex={-1}
                          >
                            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          key="err"
                          className="ds-alert ds-alert--danger"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                        >
                          <AlertCircle size={16} />
                          <span>{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button type="submit" className="login-submit cursor-pointer" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="ds-spin"><Database size={16} /></span>
                          Vérification...
                        </>
                      ) : (
                        <>
                          Se connecter
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="login-divider">
                    <span>Comptes de démonstration</span>
                  </div>

                  <div className="login-demo-grid">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <motion.button
                        key={acc.user}
                        type="button"
                        onClick={() => fillDemo(acc)}
                        className={`login-demo cursor-pointer ${selected === acc.user ? 'login-demo--active' : ''}`}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className={`login-demo__icon login-demo__icon--${acc.hue}`}>
                          <acc.icon size={15} />
                        </span>
                        <span className="login-demo__body">
                          <span className="login-demo__role">{acc.role}</span>
                          <span className="login-demo__creds mono">{acc.user} - {acc.pass}</span>
                        </span>
                      </motion.button>
                    ))}
                  </div>

                  <footer className="login-portal-card__footer">
                    <span className="muted text-xs">v3.2.0 - Soutenance ready</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>
                      <Shield size={10} /> chiffré bout-en-bout
                    </span>
                  </footer>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
