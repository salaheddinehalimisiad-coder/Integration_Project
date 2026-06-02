import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network, Shield, Zap, Database, ArrowRight,
  Globe, Cpu, BrainCircuit, Blocks, Sparkles,
  BarChart4, CheckCircle2, MessageSquare,
  Code2, PlayCircle, Waves, GitBranch, Rocket,
  Sun, Moon, ChevronRight, Lock, Eye, Gauge,
  Star, Users, Clock, Target, ChevronDown, ChevronUp,
  Quote, Menu, X, FileJson, Server, Table
} from 'lucide-react';
import { useTheme } from '../components/Theme/ThemeProvider';
import SEO from '../components/SEO/SEO';
import AuthModal from '../components/AuthModal';

/* ── Animation variants ── */
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: 'easeOut' } }
};

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

/* ── Counter hook ── */
function useCounter(end, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    const timer = setTimeout(() => requestAnimationFrame(step), 300);
    return () => clearTimeout(timer);
  }, [end, duration]);
  return count;
}

const SOURCES = [
  { icon: Database, label: 'PostgreSQL', kind: 'SQL View', color: '#336791', bg: 'rgba(51,103,145,0.08)', border: 'rgba(51,103,145,0.25)' },
  { icon: Server,   label: 'MySQL',      kind: 'SQL View', color: '#f29111', bg: 'rgba(242,145,17,0.08)', border: 'rgba(242,145,17,0.25)' },
  { icon: FileJson, label: 'MongoDB',    kind: 'NoSQL Collection', color: '#47a248', bg: 'rgba(71,162,72,0.08)', border: 'rgba(71,162,72,0.25)' },
  { icon: Network,  label: 'Neo4j Graph', kind: 'JSON Graph', color: '#008cc1', bg: 'rgba(0,140,193,0.08)', border: 'rgba(0,140,193,0.25)' },
  { icon: Code2,    label: 'XML API',    kind: 'Structured API', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)' },
  { icon: Table,    label: 'CSV File',   kind: 'Flat Database', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)' }
];

const STEPS = [
  { icon: Database, title: 'Déclarez vos sources', desc: 'Définissez la chaîne de connexion de vos 6 bases physiques (Postgres, MySQL, MongoDB, Neo4j, XML, CSV) au niveau du médiateur.' },
  { icon: BrainCircuit, title: 'Définissez les Mappings', desc: 'Établissez la correspondance exacte entre les attributs des bases de données physiques et votre schéma global virtuel.' },
  { icon: Shield, title: 'Configurez la Sécurité', desc: 'Configurez le contrôle d\'accès centralisé RBAC et appliquez le masquage ou le chiffrement de colonnes sensibles.' },
  { icon: BarChart4, title: 'Fédérez & Interrogez', desc: 'Exécutez vos requêtes globales. Le médiateur réécrit, distribue, résout les conflits et fusionne le résultat au vol.' }
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

const COMPONENTS = {
  decomposer: {
    icon: Blocks, title: 'Décomposeur GAV / LAV',
    desc: 'Analyse la requête globale virtuelle formulée par l\'utilisateur et la décompose en sous-requêtes élémentaires de réécriture basées sur les règles de correspondances globales et locales.',
    color: 'text-emerald-400', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)'
  },
  rewriter: {
    icon: Network, title: 'Moteur de Réécriture (Bucket/MiniCon)',
    desc: 'Algorithme de pointe traduisant les requêtes globales virtuelles en requêtes sources physiques optimales, résolvant les vues LAV et minimisant la charge d\'exécution locale.',
    color: 'text-indigo-400', bg: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.2)'
  },
  executor: {
    icon: Cpu, title: 'Exécuteur Distribué',
    desc: 'Distribue et coordonne l\'exécution des sous-requêtes en parallèle sur PostgreSQL, MySQL, MongoDB, Neo4j, XML et CSV, puis assemble les jeux de résultats de manière synchrone.',
    color: 'text-cyan-400', bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.2)'
  },
  resolver: {
    icon: GitBranch, title: 'Résolveur de Conflits d\'Entités',
    desc: 'Réconcilie les doublons sémantiques entre les bases en appliquant des stratégies de fusion (priorité de source, valeurs par défaut, élimination des conflits).',
    color: 'text-purple-400', bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.2)'
  },
  security: {
    icon: Lock, title: 'Garde Sécurité RBAC',
    desc: 'Intercepte les requêtes globales pour masquer les colonnes ou interdire l\'accès à certaines tables selon le rôle applicatif de l\'utilisateur connecté (admin, finance, hr, pm, viewer).',
    color: 'text-rose-400', bg: 'rgba(244, 63, 94, 0.08)', border: 'rgba(244, 63, 94, 0.2)'
  }
};

export default function Login({ onLogin }) {
  const [activeTab, setActiveTab] = useState('decomposer');
  const [isPaused, setIsPaused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { theme, toggleTheme, isDark } = useTheme();

  useEffect(() => {
    if (isPaused) return;
    const keys = Object.keys(COMPONENTS);
    const interval = setInterval(() => {
      setActiveTab(prev => {
        const currentIndex = keys.indexOf(prev);
        return keys[(currentIndex + 1) % keys.length];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  /* ── Counter values ── */
  const statSources = useCounter(6);
  const statMappings = useCounter(12);
  const statLAV = useCounter(9);
  const statConflicts = useCounter(8);

  return (
    <>
      <SEO title="DataMediator Pro — Médiation Intelligente de Données" 
           description="Fédérez vos bases de données hétérogènes en temps réel sous un schéma virtuel global" />

      <div className="relative w-full min-h-screen flex flex-col items-center overflow-x-hidden font-sans pb-20" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        
        {/* ── Ambient background glow ── */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-400/8 blur-[180px]"></div>
          <div className="absolute top-[30%] right-[5%] w-[40%] h-[40%] rounded-full bg-sky-400/8 blur-[160px]"></div>
          <div className="absolute bottom-[0%] left-[30%] w-[35%] h-[35%] rounded-full bg-violet-400/8 blur-[140px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:80px_80px] opacity-60 [mask-image:radial-gradient(ellipse_80%_100%_at_50%_0%,#000_20%,transparent_100%)]"></div>
        </div>

        {/* ── Navigation ── */}
        <nav className="fixed top-0 inset-x-0 z-[100] w-full border-b backdrop-blur-2xl transition-colors duration-500" style={{ background: isDark ? 'rgba(10,13,26,0.85)' : 'rgba(246,248,255,0.85)', borderColor: 'var(--border-subtle)' }}>
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowAuthModal(true)}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border-default)' }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                  <path d="M16 3L27 9L16 15L5 9L16 3Z" fill="#6366f1"/>
                  <path d="M16 10L27 16L16 22L5 16L16 10Z" fill="#ec4899"/>
                  <path d="M16 17L27 23L16 29L5 23L16 17Z" fill="#06b6d4"/>
                </svg>
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>DataMediator</span>
                <span className="block text-[8px] text-indigo-400 font-bold uppercase tracking-widest leading-none">PRO</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <button onClick={(e) => scrollToSection(e, 'platform')} className="hover:text-indigo-400 transition-colors cursor-pointer">Composants IA</button>
              <button onClick={(e) => scrollToSection(e, 'howitworks')} className="hover:text-indigo-400 transition-colors cursor-pointer">Comment ça marche</button>
              <button onClick={(e) => scrollToSection(e, 'integrations')} className="hover:text-indigo-400 transition-colors cursor-pointer">Bases supportées</button>
              <button onClick={(e) => scrollToSection(e, 'faq')} className="hover:text-indigo-400 transition-colors cursor-pointer">FAQ</button>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={toggleTheme} className="p-2 rounded-xl border transition-all duration-300 hover:scale-105" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: isDark ? '#fbbf24' : '#6366f1' }} title={isDark ? 'Mode Clair' : 'Mode Sombre'}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={() => setShowAuthModal(true)} className="hidden sm:block text-sm font-semibold hover:text-indigo-400 transition-colors cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Se connecter</button>
              <button onClick={() => setShowAuthModal(true)} className="text-sm font-bold text-white px-5 py-2.5 rounded-full hover:opacity-90 transition-all active:scale-95 shadow-md cursor-pointer" style={{ background: 'var(--grad-primary)', boxShadow: '0 2px 12px rgba(61,106,232,0.25)' }}>
                Accéder au Dashboard
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="lg:hidden overflow-hidden border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
                <div className="px-6 py-4 flex flex-col gap-3 text-sm font-semibold animate-fade-in" style={{ color: 'var(--text-secondary)' }}>
                  <button className="text-left" onClick={(e) => scrollToSection(e, 'platform')}>Composants IA</button>
                  <button className="text-left" onClick={(e) => scrollToSection(e, 'howitworks')}>Comment ça marche</button>
                  <button className="text-left" onClick={(e) => scrollToSection(e, 'integrations')}>Bases supportées</button>
                  <button className="text-left text-indigo-400" onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }}>Se connecter</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ── HERO ── */}
        <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-36 pb-24 md:pt-44 md:pb-32 flex flex-col items-center">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="w-full flex flex-col items-center text-center">
            
            <motion.div 
              variants={fadeInUp} 
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider mb-6 backdrop-blur-md text-indigo-600 dark:text-indigo-300"
              style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border-default)' }}
            >
              <Sparkles size={12} className="text-indigo-400" /> PROJET ACADÉMIQUE — MASTER INTÉGRATION DE DONNÉES
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 max-w-5xl" style={{ color: 'var(--text-primary)' }}>
              Une seule requête virtuelle.<br />
              <span className="gradient-text">Six sources hétérogènes fédérées.</span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-lg md:text-xl max-w-3xl mb-10 font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Interrogez vos bases de données physiques comme un système unique. Notre moteur prend en charge la réécriture de requêtes locales (LAV/GAV), la résolution des conflits et la sécurité RBAC à la volée.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center mb-16">
              <button onClick={() => setShowAuthModal(true)} className="group relative flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 text-white rounded-2xl font-semibold text-lg transition-all overflow-hidden active:scale-[0.98] hover:shadow-lg hover:shadow-indigo-500/20 cursor-pointer" style={{ background: 'var(--grad-primary)' }}>
                <Database size={20} className="group-hover:-translate-y-0.5 transition-transform text-white/80" />
                Démarrer la Console
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={(e) => scrollToSection(e, 'platform')} className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-lg transition-all active:scale-[0.98] border hover:bg-white/5 cursor-pointer animate-fade-in" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderColor: 'var(--border-default)' }}>
                <PlayCircle size={20} style={{ color: 'var(--text-muted)' }} /> Voir le fonctionnement
              </button>
            </motion.div>

            {/* Hero visual / abstract pipeline */}
            <motion.div variants={scaleIn} className="w-full max-w-5xl relative">
              <div className="rounded-3xl border p-1 shadow-2xl" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-2)', boxShadow: 'var(--shadow-lg)' }}>
                <div className="rounded-2xl p-6 md:p-10 relative overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] gap-4 items-center">
                    {[
                      { icon: Database, label: '6 Sources Physiques', color: 'text-emerald-500', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
                      { icon: BrainCircuit, label: 'Mapping GAV / LAV', color: 'text-indigo-500', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
                      { icon: Code2, label: 'Réécriture de requêtes', color: 'text-cyan-500', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)' },
                      { icon: Zap, label: 'Exécution distribuée', color: 'text-purple-500', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
                      { icon: BarChart4, label: 'Schéma Réconcilié', color: 'text-rose-500', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.2)' }
                    ].map((step, i) => (
                      <React.Fragment key={i}>
                        <motion.div 
                          whileHover={{ y: -4 }} 
                          className="flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all"
                          style={{ backgroundColor: step.bg, borderColor: step.border }}
                        >
                          <step.icon size={28} className={step.color} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: 'var(--text-secondary)' }}>{step.label}</span>
                        </motion.div>
                        {i < 4 && (
                          <div className="hidden md:flex items-center justify-center">
                            <motion.div animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}>
                              <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
                            </motion.div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  {/* Decorative bottom line */}
                  <div className="mt-6 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} className="h-full rounded-full" style={{ background: 'var(--grad-primary)' }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </main>

        {/* ── STATS SECTION ── */}
        <section className="relative z-10 w-full py-16 border-y" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: statSources, suffix: '', label: 'Sources supportées' },
              { value: statMappings, suffix: '', label: 'Relations globales' },
              { value: statLAV, suffix: '', label: 'Vues LAV définies' },
              { value: statConflicts, suffix: '', label: 'Conflits résolus' }
            ].map((stat, i) => (
              <motion.div key={i} variants={fadeInUp} className="flex flex-col items-center text-center">
                <div className="text-4xl md:text-5xl font-black gradient-text mb-2">{stat.value}{stat.suffix}</div>
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── PLATFORM COMPONENT SLIDESHOW ── */}
        <section id="platform" className="relative z-10 w-full py-24 md:py-32 border-b" style={{ borderColor: 'var(--border-subtle)', scrollMarginTop: '80px' }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5" style={{ color: 'var(--text-primary)' }}>Moteur de médiation DataMediator Pro</h2>
              <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                DataMediator intègre 5 composants technologiques clés pour réécrire, exécuter et sécuriser vos requêtes virtuelles.
              </p>
            </motion.div>

            <div className="flex flex-col lg:flex-row items-center gap-12 max-w-5xl mx-auto">
              {/* Slideshow Details Card (Left) */}
              <div className="w-full lg:w-1/2 flex flex-col gap-4">
                {Object.entries(COMPONENTS).map(([key, comp]) => {
                  const Icon = comp.icon;
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => { setActiveTab(key); setIsPaused(true); }}
                      className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                        isActive 
                          ? 'shadow-[0_4px_20px_rgba(99,102,241,0.1)]' 
                          : 'border-transparent hover:bg-black/5 dark:hover:bg-white/2'
                      }`}
                      style={{
                        background: isActive ? 'var(--bg-surface-2)' : 'transparent',
                        borderColor: isActive ? 'var(--border-brand)' : 'transparent',
                      }}
                    >
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" 
                        style={{ backgroundColor: comp.bg, border: `1px solid ${comp.border}` }}
                      >
                        <Icon size={20} className={comp.color} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold mb-1" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{comp.title}</h3>
                        {isActive && (
                          <motion.p 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            className="text-xs mt-2 leading-relaxed"
                            style={{ color: 'var(--text-secondary)' }}
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
                className="w-full lg:w-1/2 h-[380px] rounded-[32px] border p-8 relative flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-500" 
                style={{ background: 'rgba(10, 15, 30, 0.45)', borderColor: 'var(--border-soft)' }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.04)_0,transparent_75%)] pointer-events-none"></div>

                <AnimatePresence mode="wait">
                  {activeTab === 'decomposer' && (
                    <motion.div key="decomposer" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full h-full flex flex-col items-center justify-center text-center">
                      <Blocks size={80} className="text-emerald-500/20 mb-8 animate-pulse" />
                      <div className="flex gap-4 mb-8 items-center">
                        <div className="px-4 py-2 rounded-xl text-xs font-mono border bg-white/5 border-white/10 text-slate-300">Global Query</div>
                        <div className="flex items-center text-white/40"><ArrowRight size={14} /></div>
                        <div className="px-4 py-2 rounded-xl border text-xs font-mono bg-emerald-500/10 border-emerald-500/20 text-emerald-300">Local Queries</div>
                      </div>
                      <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase tracking-widest">DÉCOMPOSITION GAV / LAV</span>
                    </motion.div>
                  )}

                  {activeTab === 'rewriter' && (
                    <motion.div key="rewriter" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full h-full flex flex-col items-center justify-center text-center">
                      <Network size={80} className="text-indigo-500/20 mb-8" />
                      <div className="grid grid-cols-3 gap-6 items-center max-w-sm">
                        <div className="px-3 py-4 rounded-xl border text-[10px] font-mono bg-indigo-500/5 border-indigo-500/20 text-indigo-300">Bucket Algorithm</div>
                        <div className="px-3 py-4 rounded-xl border text-[10px] font-mono bg-white/5 border-white/10 text-slate-300">Minicon Plan</div>
                        <div className="px-3 py-4 rounded-xl border text-[10px] font-mono bg-indigo-500/5 border-indigo-500/20 text-indigo-300">Inverse Rules</div>
                      </div>
                      <span className="font-mono text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-8">MOTEUR DE RÉÉCRITURE (LAV)</span>
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
                      <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-8">EXÉCUTION DISTRIBUÉE PARALLÈLE</span>
                    </motion.div>
                  )}

                  {activeTab === 'resolver' && (
                    <motion.div key="resolver" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full h-full flex flex-col items-center justify-center text-center">
                      <GitBranch size={80} className="text-purple-500/20 mb-8" />
                      <div className="p-5 rounded-2xl border max-w-xs text-left bg-slate-900/60 border-white/5">
                        <div className="text-[10px] font-mono text-purple-400 mb-2">{">> Entity Conflict Detected"}</div>
                        <div className="text-[10px] font-mono text-slate-300">Resolved via priority mapping :</div>
                        <div className="text-[10px] font-mono text-emerald-400 font-bold mt-1">{"✓ emp_id 101 -> PostgreSQL Source"}</div>
                      </div>
                      <span className="font-mono text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-6">RÉSOLUTION DE CONFLITS</span>
                    </motion.div>
                  )}

                  {activeTab === 'security' && (
                    <motion.div key="security" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full h-full flex flex-col items-center justify-center text-center">
                      <Lock size={80} className="text-rose-500/20 mb-8 animate-bounce" />
                      <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/25 flex items-center gap-3">
                        <Shield size={20} className="text-rose-400" />
                        <span className="font-mono text-xs text-rose-300">{"Col: salary -> FILTERED (Role: pm)"}</span>
                      </div>
                      <span className="font-mono text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-8">SÉCURITÉ D'ACCÈS RBAC</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* ── BEFORE / AFTER COMPARATIVE ── */}
        <section className="relative z-10 w-full py-24 md:py-32 border-b" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
          <div className="max-w-6xl mx-auto px-6">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5" style={{ color: 'var(--text-primary)' }}>Fédération Virtuelle vs ETL Classique</h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>Voyez la différence de complexité au quotidien pour vos ingénieurs de données.</p>
            </motion.div>

            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* BEFORE */}
              <motion.div variants={slideInLeft} className="rounded-[28px] border p-8" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface-2)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20">
                    <Clock size={20} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Intégration classique (ETL/Data Warehouse)</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Sources physiques distinctes', val: '6 protocoles & formats à coder' },
                    { label: 'Structure du schéma', val: 'Rigide et répliquée localement' },
                    { label: 'Traitement des requêtes', val: 'Manuel ou synchronisation par batchs' },
                    { label: 'Sécurité RBAC', val: 'Configurée séparément sur 6 bases' },
                    { label: 'Gestion des doublons', val: 'Scripts complexes de nettoyage post-chargement' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-surface)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span className="text-sm font-bold text-red-400">{item.val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div variants={slideInRight} className="rounded-[28px] border p-8 relative overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(61,106,232,0.15)' }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(61,106,232,0.06)_0,transparent_50%)]" />
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                    <Zap size={20} className="text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Avec DataMediator Pro</h3>
                </div>
                <div className="space-y-4 relative z-10">
                  {[
                    { label: 'Sources physiques distinctes', val: 'Interface SQL virtuelle unique', highlight: true },
                    { label: 'Structure du schéma', val: 'Dynamique (GAV/LAV en temps réel)', highlight: true },
                    { label: 'Traitement des requêtes', val: 'Traduction automatique à l\'exécution', highlight: true },
                    { label: 'Sécurité RBAC', val: 'Centralisée au niveau du médiateur', highlight: true },
                    { label: 'Gestion des doublons', val: 'Entity Resolution Engine instantané', highlight: true },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border" style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.1)' }}>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span className="text-sm font-bold text-emerald-400">{item.val}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="howitworks" className="relative z-10 w-full py-24 md:py-32" style={{ scrollMarginTop: '80px' }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5" style={{ color: 'var(--text-primary)' }}>Comment ça marche ?</h2>
              <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Une fédération fluide et sécurisée en 4 étapes clés, sans avoir à copier de données physiques.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {STEPS.map((step, i) => (
                <motion.div key={i} variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} className="group relative rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg" style={{ background: 'var(--grad-primary)' }}>
                    <step.icon size={26} />
                  </div>
                  <div className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Étape {i + 1}</div>
                  <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
                  {i < 3 && <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10"><ArrowRight size={18} style={{ color: 'var(--text-dim)' }} /></div>}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── INTEGRATIONS GRID ── */}
        <section id="integrations" className="relative z-10 w-full py-24 md:py-32 border-b" style={{ borderColor: 'var(--border-subtle)', scrollMarginTop: '80px' }}>
          <div className="max-w-7xl mx-auto px-6">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5" style={{ color: 'var(--text-primary)' }}>Sources & Bases Fédérées</h2>
              <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                DataMediator Pro s'interface sans aucun agent local avec 6 formats de données structurés et semi-structurés.
              </p>
            </motion.div>

            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
              {SOURCES.map((src, i) => {
                const Icon = src.icon;
                return (
                  <motion.div
                    key={i}
                    variants={scaleIn}
                    whileHover={{ scale: 1.05, y: -4 }}
                    className="flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all text-center cursor-pointer"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                    onClick={() => setShowAuthModal(true)}
                  >
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border" style={{ backgroundColor: src.bg, borderColor: src.border }}>
                      <Icon size={24} style={{ color: src.color }} />
                    </div>
                    <div>
                      <span className="block font-bold text-sm text-white" style={{ color: 'var(--text-primary)' }}>{src.label}</span>
                      <span className="block text-[10px] text-slate-400 mt-1" style={{ color: 'var(--text-muted)' }}>{src.kind}</span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── FAQ SECTION ── */}
        <section id="faq" className="relative z-10 w-full py-24 md:py-32" style={{ scrollMarginTop: '80px' }}>
          <div className="max-w-3xl mx-auto px-6">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5" style={{ color: 'var(--text-primary)' }}>Questions Fréquentes</h2>
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Tout savoir sur le moteur de médiation DataMediator Pro.</p>
            </motion.div>

            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-col gap-4">
              {FAQS.map((faq, i) => (
                <motion.div key={i} variants={fadeInUp} className="rounded-2xl border overflow-hidden transition-all" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-6 text-left cursor-pointer">
                    <span className="font-bold text-sm md:text-base pr-4" style={{ color: 'var(--text-primary)' }}>{faq.q}</span>
                    {openFaq === i ? <ChevronUp size={20} className="text-indigo-500 shrink-0" /> : <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} className="shrink-0" />}
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-6 pb-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{faq.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="w-full py-24 md:py-32 border-t relative overflow-hidden flex flex-col items-center justify-center text-center" style={{ borderColor: 'var(--border-subtle)', background: 'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-elevated) 100%)' }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(61,106,232,0.06)_0,transparent_60%)]"></div>
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="relative z-10 max-w-2xl px-6 flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 tracking-tight" style={{ color: 'var(--text-primary)' }}>Prêt à fédérer vos données ?</h2>
            <p className="text-lg mb-10 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Accédez à la console d'administration et interrogez vos 6 sources locales en temps réel sous un schéma unique.
            </p>
            <button onClick={() => setShowAuthModal(true)} className="px-8 py-4 text-white rounded-2xl font-semibold text-lg hover:scale-[1.02] transition-all flex items-center gap-3 group shadow-xl shadow-indigo-500/15 cursor-pointer" style={{ background: 'var(--grad-primary)' }}>
              Lancer la Console de médiation
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="w-full border-t py-16 transition-colors duration-500" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b pb-8 mb-8" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                  <path d="M16 3L27 9L16 15L5 9L16 3Z" fill="#6366f1"/>
                  <path d="M16 10L27 16L16 22L5 16L16 10Z" fill="#ec4899"/>
                  <path d="M16 17L27 23L16 29L5 23L16 17Z" fill="#06b6d4"/>
                </svg>
                <span className="font-extrabold text-sm text-white tracking-tight" style={{ color: 'var(--text-primary)' }}>DataMediator Pro</span>
              </div>
              <p className="text-xs text-slate-400" style={{ color: 'var(--text-muted)' }}>&copy; 2026 Projet Académique. Master Intégration de Données. Soutenance ready.</p>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Architecture GAV / LAV · JWT · Bcrypt · RBAC Secured</span>
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Fait avec précision · Session sécurisée</span>
            </div>
          </div>
        </footer>

        {/* ── AUTH MODAL ── */}
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
          onSuccess={(userData) => {
            setShowAuthModal(false);
            onLogin?.(userData);
          }} 
        />

        <style dangerouslySetInnerHTML={{ __html: `
          .shadow-glow { box-shadow: 0 0 25px rgba(99,102,241,0.3); }
          ::-webkit-scrollbar { width: 5px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(61,106,232,0.15); border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(61,106,232,0.3); }
        ` }} />
      </div>
    </>
  );
}
