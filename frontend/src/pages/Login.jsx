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
  { icon: Database, label: 'PostgreSQL', kind: 'SQL View', color: '#336791', bg: 'rgba(51,103,145,0.08)', border: 'rgba(51,103,145,0.25)', image: '/images/postgresql.png' },
  { icon: Server, label: 'MySQL', kind: 'SQL View', color: '#f29111', bg: 'rgba(242,145,17,0.08)', border: 'rgba(242,145,17,0.25)', image: '/images/mysql.png' },
  { icon: FileJson, label: 'MongoDB', kind: 'NoSQL Collection', color: '#47a248', bg: 'rgba(71,162,72,0.08)', border: 'rgba(71,162,72,0.25)', image: '/images/mongodb.png' },
  { icon: Network, label: 'Neo4j Graph', kind: 'JSON Graph', color: '#008cc1', bg: 'rgba(0,140,193,0.08)', border: 'rgba(0,140,193,0.25)', image: '/images/neo4j.png' },
  { icon: Code2, label: 'XML API', kind: 'Structured API', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)', image: '/images/restapi.png' },
  { icon: Table, label: 'CSV File', kind: 'Flat Database', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', image: '/images/csv.png' }
];

const STEPS = [
  { icon: Database, image: '/images/step1.png', title: 'Déclarez vos sources', desc: 'Définissez la chaîne de connexion de vos 6 bases physiques (Postgres, MySQL, MongoDB, Neo4j, XML, CSV) au niveau du médiateur.' },
  { icon: BrainCircuit, image: '/images/step2.png', title: 'Définissez les Mappings', desc: 'Établissez la correspondance exacte entre les attributs des bases de données physiques et votre schéma global virtuel.' },
  { icon: Shield, image: '/images/step3.png', title: 'Configurez la Sécurité', desc: 'Configurez le contrôle d\'accès centralisé RBAC et appliquez le masquage ou le chiffrement de colonnes sensibles.' },
  { icon: BarChart4, image: '/images/step4.png', title: 'Fédérez & Interrogez', desc: 'Exécutez vos requêtes globales. Le médiateur réécrit, distribue, résout les conflits et fusionne le résultat au vol.' }
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
  const [progress, setProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { theme, toggleTheme, isDark } = useTheme();

  useEffect(() => {
    let start = performance.now();
    let animationFrameId;

    const animate = (time) => {
      const delta = time - start;
      const totalDuration = 5000;

      if (delta >= totalDuration) {
        setProgress(0);
        setActiveTab(curr => {
          const keys = Object.keys(COMPONENTS);
          const idx = keys.indexOf(curr);
          return keys[(idx + 1) % keys.length];
        });
      } else {
        setProgress((delta / totalDuration) * 100);
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [activeTab]);

  const handleTabClick = (key) => {
    setActiveTab(key);
    setProgress(0);
  };

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

      <div className="relative w-full min-h-screen overflow-x-hidden font-sans pb-20" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

        {/* ── Ambient background glow ── */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-400/8 blur-[180px]"></div>
          <div className="absolute top-[30%] right-[5%] w-[40%] h-[40%] rounded-full bg-sky-400/8 blur-[160px]"></div>
          <div className="absolute bottom-[0%] left-[30%] w-[35%] h-[35%] rounded-full bg-violet-400/8 blur-[140px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:80px_80px] opacity-60 [mask-image:radial-gradient(ellipse_80%_100%_at_50%_0%,#000_20%,transparent_100%)]"></div>
        </div>

        {/* ── Navigation ── */}
        <nav className="fixed top-0 inset-x-0 z-[100] w-full border-b backdrop-blur-2xl transition-colors duration-500" style={{ background: isDark ? 'rgba(10,13,26,0.85)' : 'rgba(246,248,255,0.85)', borderColor: 'var(--border-subtle)' }}>
          <div className="max-w-7xl mx-auto px-6 h-28 flex items-center justify-between">
            <div className="flex items-center cursor-pointer" onClick={() => setShowAuthModal(true)}>
              <img src="/logo.png" alt="DataMediator Pro" className="h-24 w-auto object-contain" />
            </div>

            <div className="hidden lg:flex items-center gap-8 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <button onClick={(e) => scrollToSection(e, 'platform')} className="hover:text-indigo-400 transition-colors cursor-pointer">Fonctionnement</button>
              <button onClick={(e) => scrollToSection(e, 'howitworks')} className="hover:text-indigo-400 transition-colors cursor-pointer">Comment ça marche</button>
              <button onClick={(e) => scrollToSection(e, 'integrations')} className="hover:text-indigo-400 transition-colors cursor-pointer">Bases supportées</button>
              <button onClick={(e) => scrollToSection(e, 'faq')} className="hover:text-indigo-400 transition-colors cursor-pointer">FAQ</button>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={toggleTheme} className="p-2 rounded-xl border transition-all duration-300 hover:scale-105" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: isDark ? '#fbbf24' : '#6366f1' }} title={isDark ? 'Mode Clair' : 'Mode Sombre'}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={() => setShowAuthModal(true)} className="text-sm font-bold text-white px-5 py-2.5 rounded-full hover:opacity-90 transition-all active:scale-95 shadow-md cursor-pointer" style={{ background: 'var(--grad-primary)', boxShadow: '0 2px 12px rgba(61,106,232,0.25)' }}>
                Se connecter
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
                  <button className="text-left" onClick={(e) => scrollToSection(e, 'platform')}>Fonctionnement</button>
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

            {/* Eyebrow removed */}

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
            <motion.div variants={scaleIn} className="w-full max-w-7xl relative">
              <div className="rounded-3xl border p-1 shadow-2xl" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-2)', boxShadow: 'var(--shadow-lg)' }}>
                <div className="rounded-2xl p-4 md:p-8 relative overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                  <div className="flex flex-col lg:flex-row items-stretch justify-between gap-3 w-full">
                    {[
                      { icon: Database, image: '/images/hero1.png', label: '6 Sources Physiques', color: 'text-emerald-500', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
                      { icon: BrainCircuit, image: '/images/hero2.png', label: 'Mapping GAV / LAV', color: 'text-indigo-500', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
                      { icon: Code2, image: '/images/hero3.png', label: 'Réécriture de requêtes', color: 'text-cyan-500', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)' },
                      { icon: Zap, image: '/images/hero4.png', label: 'Exécution distribuée', color: 'text-purple-500', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
                      { icon: BarChart4, image: '/images/hero5.png', label: 'Schéma Réconcilié', color: 'text-rose-500', bg: 'rgba(244,63,94,0.08)', border: 'rgba(244,63,94,0.2)' }
                    ].map((step, i) => (
                      <React.Fragment key={i}>
                        <motion.div
                          whileHover={{ scale: 1.05, y: -4 }}
                          className="flex flex-col items-center justify-between gap-3 p-3 md:p-4 rounded-2xl border transition-all flex-1 min-w-[150px]"
                          style={{ backgroundColor: step.bg, borderColor: step.border }}
                        >
                          {step.image ? (
                            <img src={step.image} alt={step.label} className="h-24 md:h-32 lg:h-36 w-full object-contain mix-blend-multiply dark:mix-blend-normal dark:invert hover:scale-110 transition-transform duration-300" />
                          ) : (
                            <step.icon size={28} className={step.color} />
                          )}
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-center" style={{ color: 'var(--text-secondary)' }}>{step.label}</span>
                        </motion.div>
                        {i < 4 && (
                          <div className="hidden lg:flex items-center justify-center shrink-0">
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
        <section id="platform" className="relative z-10 w-full py-28 md:py-36 border-b" style={{ borderColor: 'var(--border-subtle)', scrollMarginTop: '80px' }}>
          {/* Section ambient glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full blur-[200px]" style={{ background: activeTab === 'decomposer' ? 'rgba(16,185,129,0.06)' : activeTab === 'rewriter' ? 'rgba(99,102,241,0.06)' : activeTab === 'executor' ? 'rgba(6,182,212,0.06)' : activeTab === 'resolver' ? 'rgba(168,85,247,0.06)' : 'rgba(244,63,94,0.06)', transition: 'background 1s ease' }}></div>
            <div className="absolute bottom-[5%] right-[15%] w-[30%] h-[30%] rounded-full blur-[160px]" style={{ background: activeTab === 'decomposer' ? 'rgba(16,185,129,0.04)' : activeTab === 'rewriter' ? 'rgba(99,102,241,0.04)' : activeTab === 'executor' ? 'rgba(6,182,212,0.04)' : activeTab === 'resolver' ? 'rgba(168,85,247,0.04)' : 'rgba(244,63,94,0.04)', transition: 'background 1s ease' }}></div>
          </div>

          <div className="max-w-7xl mx-auto px-6 relative">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-20">
              {/* Eyebrow removed */}
              <h2 className="text-3xl md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight mb-6 leading-[1.1]" style={{ color: 'var(--text-primary)' }}>
                Moteur de médiation{' '}
                <span className="gradient-text">DataMediator Pro</span>
              </h2>
              <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                5 composants technologiques orchestrés pour réécrire, exécuter et sécuriser vos requêtes virtuelles en temps réel.
              </p>
            </motion.div>

            <div className="flex flex-col lg:flex-row items-stretch gap-8 lg:gap-10 max-w-6xl mx-auto">
              {/* Slideshow Details Card (Left) */}
              <div className="w-full lg:w-[45%] flex flex-col gap-2.5">
                {Object.entries(COMPONENTS).map(([key, comp]) => {
                  const Icon = comp.icon;
                  const isActive = activeTab === key;
                  const accentColor = comp.color.includes('emerald') ? '#10b981' :
                    comp.color.includes('indigo') ? '#6366f1' :
                      comp.color.includes('cyan') ? '#06b6d4' :
                        comp.color.includes('purple') ? '#a855f7' : '#f43f5e';
                  return (
                    <button
                      key={key}
                      onClick={() => handleTabClick(key)}
                      className="relative overflow-hidden flex items-start gap-4 p-5 rounded-2xl text-left transition-all duration-400 cursor-pointer group"
                      style={{
                        background: isActive ? 'var(--bg-surface-2)' : 'transparent',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: isActive ? `${accentColor}33` : 'transparent',
                        boxShadow: isActive ? `0 4px 24px ${accentColor}15, 0 1px 3px rgba(0,0,0,0.1)` : 'none',
                      }}
                    >
                      {/* Active accent stripe left */}
                      <div
                        className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-full transition-all duration-400"
                        style={{
                          backgroundColor: accentColor,
                          opacity: isActive ? 1 : 0,
                          transform: isActive ? 'scaleY(1)' : 'scaleY(0)',
                        }}
                      />
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                        style={{
                          backgroundColor: isActive ? `${accentColor}18` : comp.bg,
                          border: `1px solid ${isActive ? `${accentColor}40` : comp.border}`,
                          boxShadow: isActive ? `0 0 20px ${accentColor}20` : 'none'
                        }}
                      >
                        <Icon size={20} className={comp.color} style={{ filter: isActive ? `drop-shadow(0 0 6px ${accentColor}60)` : 'none' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold mb-0.5 transition-colors duration-300" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>{comp.title}</h3>
                        <AnimatePresence>
                          {isActive && (
                            <motion.p
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                              className="text-xs leading-relaxed"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {comp.desc}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                      {/* Progress bar at bottom */}
                      {isActive && (
                        <div
                          className="absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-75 ease-linear"
                          style={{
                            width: `${progress}%`,
                            background: `linear-gradient(90deg, ${accentColor}00, ${accentColor})`,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Interactive Slide Graphic (Right) */}
              <div
                className="w-full lg:w-[55%] min-h-[420px] lg:min-h-[480px] rounded-[28px] relative flex items-center justify-center overflow-hidden transition-all duration-700"
                style={{
                  background: isDark ? 'linear-gradient(145deg, rgba(8,12,28,0.95) 0%, rgba(15,20,40,0.9) 100%)' : 'var(--bg-surface)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.12)'}`,
                  boxShadow: isDark
                    ? '0 25px 60px -15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)'
                    : '0 8px 40px -10px rgba(99,102,241,0.08), 0 0 0 1px rgba(99,102,241,0.04)'
                }}
              >
                {/* Background animated grid */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: isDark
                    ? 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)'
                    : 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                  maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 20%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 20%, transparent 100%)'
                }}></div>

                {/* Central glow orb that changes color per tab */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full pointer-events-none transition-all duration-1000"
                  style={{
                    background: `radial-gradient(circle, ${activeTab === 'decomposer' ? 'rgba(16,185,129,0.12)' :
                      activeTab === 'rewriter' ? 'rgba(99,102,241,0.12)' :
                        activeTab === 'executor' ? 'rgba(6,182,212,0.12)' :
                          activeTab === 'resolver' ? 'rgba(168,85,247,0.12)' :
                            'rgba(244,63,94,0.12)'
                      } 0%, transparent 70%)`,
                    filter: 'blur(40px)'
                  }}
                />

                <AnimatePresence mode="wait">
                  {activeTab === 'decomposer' && (
                    <motion.div key="decomposer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="w-full h-full flex flex-col items-center justify-center text-center px-6 py-8 relative">
                      {/* Node graph visualization */}
                      <svg width="320" height="200" viewBox="0 0 320 200" fill="none" className="mb-6">
                        {/* Connection lines with animation */}
                        <motion.line x1="160" y1="35" x2="60" y2="130" stroke="rgba(16,185,129,0.5)" strokeWidth="2" strokeDasharray="6 4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.2 }} />
                        <motion.line x1="160" y1="35" x2="160" y2="130" stroke="rgba(16,185,129,0.5)" strokeWidth="2" strokeDasharray="6 4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.4 }} />
                        <motion.line x1="160" y1="35" x2="260" y2="130" stroke="rgba(16,185,129,0.5)" strokeWidth="2" strokeDasharray="6 4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.6 }} />

                        {/* Animated data flow particles */}
                        <motion.circle r="4" fill="#10b981" animate={{ cx: [160, 60], cy: [35, 130], opacity: [1, 0.4] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5 }} />
                        <motion.circle r="4" fill="#10b981" animate={{ cx: [160, 160], cy: [35, 130], opacity: [1, 0.4] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5, delay: 0.3 }} />
                        <motion.circle r="4" fill="#10b981" animate={{ cx: [160, 260], cy: [35, 130], opacity: [1, 0.4] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5, delay: 0.6 }} />

                        {/* Source node (top) */}
                        <motion.rect x="120" y="10" width="80" height="50" rx="12" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} />
                        <text x="160" y="38" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="700" fontFamily="monospace">GLOBAL</text>

                        {/* Target nodes (bottom) */}
                        {[{ x: 20, label: 'PG' }, { x: 120, label: 'MY' }, { x: 220, label: 'MG' }].map((node, i) => (
                          <g key={i}>
                            <motion.rect x={node.x} y="110" width="80" height="45" rx="10" fill={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(16,185,129,0.06)'} stroke="rgba(16,185,129,0.35)" strokeWidth="1.5" initial={{ y: 140, opacity: 0 }} animate={{ y: 110, opacity: 1 }} transition={{ delay: 0.3 + i * 0.15, type: 'spring' }} />
                            <motion.text x={node.x + 40} y="137" textAnchor="middle" fill={isDark ? 'rgba(255,255,255,0.6)' : '#059669'} fontSize="11" fontWeight="700" fontFamily="monospace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.15 }}>{node.label}</motion.text>
                          </g>
                        ))}
                      </svg>

                      <div className="flex items-center gap-3 mb-4">
                        <div className="px-4 py-2 rounded-xl text-xs font-mono border backdrop-blur-sm" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', color: isDark ? '#94a3b8' : '#64748b' }}>
                          SELECT * FROM global_employees
                        </div>
                        <motion.div animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                          <ArrowRight size={16} className="text-emerald-400" />
                        </motion.div>
                        <div className="px-3 py-2 rounded-xl text-xs font-mono font-bold border" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)', color: '#10b981' }}>3 sub-queries</div>
                      </div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: '#10b981' }}>Décomposition GAV / LAV</span>
                    </motion.div>
                  )}

                  {activeTab === 'rewriter' && (
                    <motion.div key="rewriter" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="w-full h-full flex flex-col items-center justify-center text-center px-6 py-8">
                      {/* Algorithm visualization */}
                      <svg width="300" height="180" viewBox="0 0 300 180" fill="none" className="mb-6">
                        {/* Central processing node */}
                        <motion.circle cx="150" cy="90" r="35" fill="rgba(99,102,241,0.1)" stroke="rgba(99,102,241,0.45)" strokeWidth="1.5" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} />
                        <motion.circle cx="150" cy="90" r="20" fill="rgba(99,102,241,0.2)" initial={{ scale: 0 }} animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                        <text x="150" y="94" textAnchor="middle" fill="#818cf8" fontSize="9" fontWeight="700" fontFamily="monospace">REWRITE</text>

                        {/* Orbiting algorithm nodes */}
                        {[
                          { angle: -60, label: 'Bucket', color: '#818cf8' },
                          { angle: 60, label: 'MiniCon', color: '#a78bfa' },
                          { angle: 180, label: 'InvRules', color: '#6366f1' }
                        ].map((alg, i) => {
                          const rad = (alg.angle * Math.PI) / 180;
                          const cx = 150 + Math.cos(rad) * 100;
                          const cy = 90 + Math.sin(rad) * 65;
                          return (
                            <g key={i}>
                              <motion.line x1="150" y1="90" x2={cx} y2={cy} stroke={`${alg.color}40`} strokeWidth="1" strokeDasharray="4 3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: i * 0.2 }} />
                              <motion.rect x={cx - 32} y={cy - 14} width="64" height="28" rx="8" fill={`${alg.color}12`} stroke={`${alg.color}30`} strokeWidth="1" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 + i * 0.2, type: 'spring' }} />
                              <motion.text x={cx} y={cy + 4} textAnchor="middle" fill={alg.color} fontSize="9" fontWeight="600" fontFamily="monospace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.2 }}>{alg.label}</motion.text>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Terminal-style output */}
                      <div className="rounded-xl border p-3 text-left max-w-[280px] w-full" style={{ background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(99,102,241,0.04)', borderColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.18)' }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-2 h-2 rounded-full bg-red-400/60"></div>
                          <div className="w-2 h-2 rounded-full bg-yellow-400/60"></div>
                          <div className="w-2 h-2 rounded-full bg-green-400/60"></div>
                          <span className="text-[9px] ml-2 font-mono" style={{ color: 'var(--text-muted)' }}>rewriter.log</span>
                        </div>
                        <div className="font-mono text-[10px] leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                          <span style={{ color: isDark ? '#818cf8' : '#6366f1' }}>▸</span> Optimizing query plan...<br />
                          <span style={{ color: '#10b981' }}>✓</span> 3 views rewritten<br />
                          <span style={{ color: '#10b981' }}>✓</span> Cost reduced by <span style={{ color: isDark ? '#818cf8' : '#6366f1', fontWeight: 700 }}>42%</span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] mt-5" style={{ color: '#6366f1' }}>Moteur de Réécriture (LAV)</span>
                    </motion.div>
                  )}

                  {activeTab === 'executor' && (
                    <motion.div key="executor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="w-full h-full flex flex-col items-center justify-center text-center px-6 py-8">
                      {/* Distributed execution visualization */}
                      <div className="relative mb-8">
                        {/* Central coordinator */}
                        <motion.div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10" style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)' }} animate={{ boxShadow: ['0 0 20px rgba(6,182,212,0.1)', '0 0 35px rgba(6,182,212,0.2)', '0 0 20px rgba(6,182,212,0.1)'] }} transition={{ duration: 2.5, repeat: Infinity }}>
                          <Cpu size={28} className="text-cyan-400" />
                        </motion.div>

                        {/* Database nodes in arc */}
                        <div className="flex gap-5 justify-center items-end">
                          {[
                            { src: '/images/postgresql.png', label: 'PG', delay: 0, status: '✓' },
                            { src: '/images/mysql.png', label: 'MY', delay: 0.15, status: '✓' },
                            { src: '/images/mongodb.png', label: 'MG', delay: 0.3, status: '⟳' },
                            { src: '/images/neo4j.png', label: 'N4', delay: 0.45, status: '…' }
                          ].map((db, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ y: 30, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: db.delay, type: 'spring', stiffness: 200 }}
                              className="flex flex-col items-center gap-2"
                            >
                              {/* Connection line dot */}
                              <motion.div
                                className="w-1 h-8 rounded-full"
                                style={{ background: `linear-gradient(to bottom, rgba(6,182,212,0.3), rgba(6,182,212,0))` }}
                                animate={{ opacity: [0.3, 0.8, 0.3] }}
                                transition={{ duration: 1.5, delay: db.delay, repeat: Infinity }}
                              />
                              <motion.div
                                className="w-14 h-14 p-2.5 rounded-2xl flex items-center justify-center relative"
                                style={{
                                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                                }}
                                whileHover={{ scale: 1.1, y: -4 }}
                              >
                                <img src={db.src} alt={db.label} className="w-full h-full object-contain" />
                                <motion.div
                                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                                  style={{ background: db.status === '✓' ? '#10b981' : db.status === '⟳' ? '#f59e0b' : '#6366f1', color: 'white' }}
                                  animate={db.status === '⟳' ? { rotate: [0, 360] } : {}}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                  {db.status}
                                </motion.div>
                              </motion.div>
                              <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--text-muted)' }}>{db.label}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Progress indicator */}
                      <div className="w-full max-w-[260px] mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Exécution parallèle</span>
                          <motion.span className="text-[10px] font-mono font-bold text-cyan-400" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>75%</motion.span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                          <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #06b6d4, #22d3ee)' }} initial={{ width: '0%' }} animate={{ width: '75%' }} transition={{ duration: 1.5, ease: 'easeOut' }} />
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: '#06b6d4' }}>Exécution Distribuée Parallèle</span>
                    </motion.div>
                  )}

                  {activeTab === 'resolver' && (
                    <motion.div key="resolver" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="w-full h-full flex flex-col items-center justify-center text-center px-6 py-8">
                      {/* Entity resolution visualization */}
                      <svg width="280" height="140" viewBox="0 0 280 140" fill="none" className="mb-5">
                        {/* Duplicate entities merging */}
                        <motion.rect x="10" y="20" width="90" height="55" rx="10" fill="rgba(168,85,247,0.08)" stroke="rgba(168,85,247,0.4)" strokeWidth="1.5" initial={{ x: -20, opacity: 0 }} animate={{ x: 10, opacity: 1 }} transition={{ duration: 0.6 }} />
                        <text x="55" y="42" textAnchor="middle" fill={isDark ? '#94a3b8' : '#475569'} fontSize="8" fontWeight="600" fontFamily="monospace">emp_id: 101</text>
                        <text x="55" y="55" textAnchor="middle" fill="#a855f7" fontSize="8" fontWeight="600" fontFamily="monospace">Source: PG</text>
                        <text x="55" y="68" textAnchor="middle" fill={isDark ? '#64748b' : '#64748b'} fontSize="7" fontWeight="500" fontFamily="monospace">salary: 45000</text>

                        <motion.rect x="180" y="20" width="90" height="55" rx="10" fill="rgba(168,85,247,0.08)" stroke="rgba(168,85,247,0.4)" strokeWidth="1.5" initial={{ x: 300, opacity: 0 }} animate={{ x: 180, opacity: 1 }} transition={{ duration: 0.6 }} />
                        <text x="225" y="42" textAnchor="middle" fill={isDark ? '#94a3b8' : '#475569'} fontSize="8" fontWeight="600" fontFamily="monospace">emp_id: 101</text>
                        <text x="225" y="55" textAnchor="middle" fill="#c084fc" fontSize="8" fontWeight="600" fontFamily="monospace">Source: MY</text>
                        <text x="225" y="68" textAnchor="middle" fill={isDark ? '#64748b' : '#64748b'} fontSize="7" fontWeight="500" fontFamily="monospace">salary: 47000</text>

                        {/* Merge arrows */}
                        <motion.path d="M100 47 L125 100" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" strokeDasharray="4 3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.6 }} />
                        <motion.path d="M180 47 L155 100" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" strokeDasharray="4 3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.8 }} />

                        {/* Resolved entity */}
                        <motion.rect x="105" y="90" width="70" height="40" rx="10" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.35)" strokeWidth="1.5" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1, type: 'spring' }} />
                        <motion.text x="140" y="107" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="700" fontFamily="monospace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>✓ Resolved</motion.text>
                        <motion.text x="140" y="120" textAnchor="middle" fill="#10b981" fontSize="7" fontFamily="monospace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>PG priority</motion.text>
                      </svg>

                      {/* Conflict resolution log */}
                      <div className="rounded-xl border p-3 text-left max-w-[280px] w-full" style={{ background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(168,85,247,0.04)', borderColor: isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.18)' }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-2 h-2 rounded-full bg-red-400/60"></div>
                          <div className="w-2 h-2 rounded-full bg-yellow-400/60"></div>
                          <div className="w-2 h-2 rounded-full bg-green-400/60"></div>
                          <span className="text-[9px] ml-2 font-mono" style={{ color: 'var(--text-muted)' }}>conflicts.log</span>
                        </div>
                        <div className="font-mono text-[10px] leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                          <span style={{ color: '#f59e0b' }}>⚠</span> Conflict on <span style={{ color: '#a855f7' }}>emp_id:101</span><br />
                          <span style={{ color: '#10b981' }}>✓</span> Resolved → <span style={{ color: '#10b981', fontWeight: 700 }}>PostgreSQL wins</span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] mt-5" style={{ color: '#a855f7' }}>Résolution de Conflits</span>
                    </motion.div>
                  )}

                  {activeTab === 'security' && (
                    <motion.div key="security" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="w-full h-full flex flex-col items-center justify-center text-center px-6 py-8">
                      {/* Security shield visualization */}
                      <div className="relative mb-6">
                        <motion.div
                          className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
                          style={{ background: 'rgba(244,63,94,0.08)', border: '1.5px solid rgba(244,63,94,0.25)' }}
                          animate={{ boxShadow: ['0 0 0 0 rgba(244,63,94,0)', '0 0 0 12px rgba(244,63,94,0.06)', '0 0 0 0 rgba(244,63,94,0)'] }}
                          transition={{ duration: 2.5, repeat: Infinity }}
                        >
                          <Shield size={36} className="text-rose-400" />
                        </motion.div>
                        {/* Orbiting lock icons */}
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="absolute w-6 h-6 rounded-lg flex items-center justify-center"
                            style={{
                              background: 'rgba(244,63,94,0.1)',
                              border: '1px solid rgba(244,63,94,0.2)',
                              top: '50%', left: '50%'
                            }}
                            animate={{
                              x: [Math.cos((i * 120 * Math.PI) / 180) * 52 - 12, Math.cos(((i * 120 + 360) * Math.PI) / 180) * 52 - 12],
                              y: [Math.sin((i * 120 * Math.PI) / 180) * 52 - 12, Math.sin(((i * 120 + 360) * Math.PI) / 180) * 52 - 12],
                            }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                          >
                            <Lock size={10} className="text-rose-400" />
                          </motion.div>
                        ))}
                      </div>

                      {/* RBAC role matrix */}
                      <div className="grid grid-cols-3 gap-2 mb-5 max-w-[280px] w-full">
                        {[
                          { role: 'admin', access: 'FULL', color: '#10b981' },
                          { role: 'finance', access: 'PARTIAL', color: '#f59e0b' },
                          { role: 'pm', access: 'FILTERED', color: '#f43f5e' },
                        ].map((r, i) => (
                          <motion.div
                            key={i}
                            className="rounded-lg p-2.5 text-center border"
                            style={{
                              background: `${r.color}08`,
                              borderColor: `${r.color}20`
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3 + i * 0.15, type: 'spring' }}
                          >
                            <div className="text-[9px] font-mono font-bold mb-1" style={{ color: r.color }}>{r.role}</div>
                            <div className="text-[8px] font-mono" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{r.access}</div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Filtered column indicator */}
                      <div className="rounded-xl border p-3 flex items-center gap-3 max-w-[280px] w-full" style={{ background: 'rgba(244,63,94,0.05)', borderColor: 'rgba(244,63,94,0.18)' }}>
                        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
                          <Eye size={16} className="text-rose-400" />
                        </motion.div>
                        <div className="text-left">
                          <div className="font-mono text-[10px]" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Col: <span style={{ color: '#f43f5e', fontWeight: 700 }}>salary</span> → MASKED</div>
                          <div className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>Role: pm | Policy: column-filter</div>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] mt-5" style={{ color: '#f43f5e' }}>Sécurité d'Accès RBAC</span>
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
                  {step.image ? (
                    <img src={step.image} alt={step.title} className="h-20 w-auto mb-6 object-contain mix-blend-multiply dark:mix-blend-normal dark:invert" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg" style={{ background: 'var(--grad-primary)' }}>
                      <step.icon size={26} />
                    </div>
                  )}
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
                DataMediator Pro s'interface avec 6 formats de données structurés et semi-structurés.
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
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border overflow-hidden p-2.5" style={{ backgroundColor: src.bg, borderColor: src.border }}>
                      {src.image ? (
                        <img src={src.image} alt={src.label} className="w-full h-full object-contain filter drop-shadow-md" />
                      ) : (
                        <Icon size={24} style={{ color: src.color }} />
                      )}
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
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6 tracking-tight" style={{ color: 'var(--text-primary)' }}>Prêt à fédérer vos données?</h2>
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
              <div className="flex items-center">
                <img src="/logo.png" alt="DataMediator Pro" className="h-10 w-auto object-contain" />
              </div>
              <p className="text-xs text-slate-400" style={{ color: 'var(--text-muted)' }}>&copy; 2026 Projet Integration et Médiation des Données</p>
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

        <style dangerouslySetInnerHTML={{
          __html: `
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
