import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'frramer-motion';
import {
  AlertTriangle,
  CheckCircle,
  X,
  Users,
  Database,
  GitBranch,
  Eye,
  ArrowRight,
  ArrowLeft,
  Settings,
  RefreshCw,
  Save,
  Filter,
  Search,
  Info,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import { useTheme } from '../Theme/ThemeProvider';
import { useNotifications } from '../Notifications/NotificationSystem';
import Card from '../UI/Card';
import Button from '../UI/Button';
import './ConflictManager.css';

const ConflictManager = ({ user }) => {
  const { theme } = useTheme();
  const { success, error, warning, info } = useNotifications();
  
  const [conflicts, setConflicts] = useState([]);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [resolutionRules, setResolutionRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolutionHistory, setResolutionHistory] = useState([]);
  const [autoResolve, setAutoResolve] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadConflicts();
    loadResolutionRules();
    loadResolutionHistory();
  }, []);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/conflicts/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConflicts(data.conflicts);
      } else {
        error('Erreur lors du chargement des conflits');
      }
    } catch (err) {
      error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const loadResolutionRules = async () => {
    try {
      const response = await fetch('/api/conflicts/rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResolutionRules(data.rules);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des règles:', err);
    }
  };

  const loadResolutionHistory = async () => {
    try {
      const response = await fetch('/api/conflicts/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResolutionHistory(data.history);
      }
    } catch (err) {
      console.error('Erreur lors du chargement de l\'historique:', err);
    }
  };

  const resolveConflict = async (conflictId, resolution, source) => {
    try {
      const response = await fetch('/api/conflicts/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        },
        body: JSON.stringify({
          conflictId,
          resolution,
          chosenSource: source
        })
      });
      
      if (response.ok) {
        success('Conflit résolu avec succès');
        loadConflicts();
        loadResolutionHistory();
        setSelectedConflict(null);
      } else {
        error('Erreur lors de la résolution du conflit');
      }
    } catch (err) {
      error('Erreur de connexion au serveur');
    }
  };

  const autoResolveConflicts = async () => {
    try {
      const response = await fetch('/api/conflicts/auto-resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        success(`${data.resolved} conflits résolus automatiquement`);
        loadConflicts();
        loadResolutionHistory();
      } else {
        error('Erreur lors de la résolution automatique');
      }
    } catch (err) {
      error('Erreur de connexion au serveur');
    }
  };

  const getConflictSeverity = (conflict) => {
    const score = conflict.score || 0;
    if (score < 0.5) return 'low';
    if (score < 0.8) return 'medium';
    return 'high';
  };

  const getConflictIcon = (type) => {
    switch (type) {
      case 'duplicate': return <Users size={16} />;
      case 'inconsistent': return <Database size={16} />;
      case 'missing': return <AlertTriangle size={16} />;
      default: return <GitBranch size={16} />;
    }
  };

  const filteredConflicts = conflicts.filter(conflict => {
    const matchesFilter = filter === 'all' || getConflictSeverity(conflict) === filter;
    const matchesSearch = !searchTerm || 
      conflict.canonical_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conflict.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const ConflictCard = ({ conflict }) => (
    <motion.div
      className={`conflict-card conflict-${getConflictSeverity(conflict)}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => setSelectedConflict(conflict)}
    >
      <div className="conflict-header">
        <div className="conflict-icon">
          {getConflictIcon(conflict.type)}
        </div>
        <div className="conflict-info">
          <h4>{conflict.canonical_id}</h4>
          <p>{conflict.reason}</p>
        </div>
        <div className="conflict-severity">
          <span className={`severity-badge severity-${getConflictSeverity(conflict)}`}>
            {getConflictSeverity(conflict).toUpperCase()}
          </span>
        </div>
      </div>
      
      <div className="conflict-details">
        <div className="conflict-sources">
          <span className="sources-label">Sources:</span>
          <div className="sources-list">
            {conflict.merged_from.map((source, index) => (
              <span key={index} className="source-tag">
                {source}
              </span>
            ))}
          </div>
        </div>
        
        <div className="conflict-score">
          <span className="score-label">Score:</span>
          <span className="score-value">{(conflict.score || 0).toFixed(2)}</span>
        </div>
      </div>
      
      <div className="conflict-actions">
        <Button variant="ghost" size="sm">
          <Eye size={14} />
          Détails
        </Button>
        <Button variant="primary" size="sm">
          <Settings size={14} />
          Résoudre
        </Button>
      </div>
    </motion.div>
  );

  const ResolutionModal = () => {
    if (!selectedConflict) return null;

    return (
      <motion.div
        className="conflict-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSelectedConflict(null)}
      >
        <motion.div
          className="conflict-modal"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3>Résolution du Conflit</h3>
            <Button variant="ghost" onClick={() => setSelectedConflict(null)}>
              <X size={20} />
            </Button>
          </div>
          
          <div className="modal-content">
            <div className="conflict-summary">
              <div className="summary-item">
                <span className="label">ID:</span>
                <span className="value">{selectedConflict.canonical_id}</span>
              </div>
              <div className="summary-item">
                <span className="label">Type:</span>
                <span className="value">{selectedConflict.type}</span>
              </div>
              <div className="summary-item">
                <span className="label">Score:</span>
                <span className="value">{(selectedConflict.score || 0).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="conflict-description">
              <h4>Description</h4>
              <p>{selectedConflict.reason}</p>
            </div>
            
            <div className="sources-comparison">
              <h4>Sources concernées</h4>
              <div className="sources-grid">
                {selectedConflict.merged_from.map((source, index) => (
                  <div key={index} className="source-card">
                    <div className="source-header">
                      <Database size={16} />
                      <span>{source}</span>
                    </div>
                    <div className="source-data">
                      {/* Afficher les données spécifiques de la source */}
                      <div className="data-item">
                        <span className="data-label">Confiance:</span>
                        <span className="data-value">0.95</span>
                      </div>
                      <div className="data-item">
                        <span className="data-label">Mise à jour:</span>
                        <span className="data-value">2h</span>
                      </div>
                    </div>
                    <div className="source-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => resolveConflict(
                          selectedConflict.id,
                          'manual',
                          source
                        )}
                      >
                        <CheckCircle size={14} />
                        Choisir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="resolution-options">
              <h4>Options de résolution automatique</h4>
              <div className="options-grid">
                <Button
                  variant="secondary"
                  onClick={() => resolveConflict(
                    selectedConflict.id,
                    'highest_confidence',
                    null
                  )}
                >
                  <Shield size={16} />
                  Plus haute confiance
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => resolveConflict(
                    selectedConflict.id,
                    'most_recent',
                    null
                  )}
                >
                  <Clock size={16} />
                  Plus récent
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => resolveConflict(
                    selectedConflict.id,
                    'merge',
                    null
                  )}
                >
                  <GitBranch size={16} />
                  Fusionner
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="conflicts-loading">
        <RefreshCw size={32} className="animate-spin" />
        <p>Chargement des conflits...</p>
      </div>
    );
  }

  return (
    <div className="conflict-manager">
      <Card variant="glass" className="conflicts-card">
        {/* Header */}
        <div className="conflicts-header">
          <div className="header-title">
            <AlertTriangle size={24} />
            <div>
              <h2>Gestion des Conflits</h2>
              <p>Réconciliation intelligente des données</p>
            </div>
          </div>
          
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-value">{conflicts.length}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {conflicts.filter(c => getConflictSeverity(c) === 'high').length}
              </span>
              <span className="stat-label">Critiques</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{resolutionHistory.length}</span>
              <span className="stat-label">Résolus</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="conflicts-controls">
          <div className="search-filter">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Rechercher un conflit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-dropdown">
              <Filter size={16} />
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">Tous</option>
                <option value="high">Critiques</option>
                <option value="medium">Moyens</option>
                <option value="low">Faibles</option>
              </select>
            </div>
          </div>
          
          <div className="action-buttons">
            <Button variant="secondary" onClick={loadConflicts}>
              <RefreshCw size={16} />
              Actualiser
            </Button>
            <Button variant="primary" onClick={autoResolveConflicts}>
              <Zap size={16} />
              Auto-résolution
            </Button>
          </div>
        </div>

        {/* Conflicts List */}
        <div className="conflicts-list">
          {filteredConflicts.length > 0 ? (
            filteredConflicts.map((conflict, index) => (
              <ConflictCard key={index} conflict={conflict} />
            ))
          ) : (
            <div className="no-conflicts">
              <CheckCircle size={48} />
              <h3>Aucun conflit détecté</h3>
              <p>Toutes les données sont réconciliées</p>
            </div>
          )}
        </div>

        {/* Resolution History */}
        {resolutionHistory.length > 0 && (
          <div className="resolution-history">
            <h3>Historique des résolutions</h3>
            <div className="history-list">
              {resolutionHistory.slice(0, 5).map((item, index) => (
                <div key={index} className="history-item">
                  <div className="history-icon">
                    <CheckCircle size={16} />
                  </div>
                  <div className="history-content">
                    <span className="history-id">{item.conflictId}</span>
                    <span className="history-action">{item.resolution}</span>
                    <span className="history-time">{item.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Resolution Modal */}
      <AnimatePresence>
        <ResolutionModal />
      </AnimatePresence>
    </div>
  );
};

export default ConflictManager;
