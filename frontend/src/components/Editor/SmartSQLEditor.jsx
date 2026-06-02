import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Play,
  Save,
  History,
  Star,
  Search,
  Zap,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  Database,
  Table,
  Column
} from 'lucide-react';
import { useTheme } from '../Theme/ThemeProvider';
import { useNotifications } from '../Notifications/NotificationSystem';
import Card from '../UI/Card';
import Button from '../UI/Button';
import './SmartSQLEditor.css';

const SmartSQLEditor = ({ onExecute, user }) => {
  const { theme } = useTheme();
  const { success, error, warning } = useNotifications();
  
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [schema, setSchema] = useState({});
  const [syntaxError, setSyntaxError] = useState(null);
  
  const editorRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Charger le schéma et l'historique
  useEffect(() => {
    loadSchema();
    loadHistory();
    loadFavorites();
  }, []);

  const loadSchema = async () => {
    try {
      const response = await fetch('/api/schema/global', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dm_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSchema(data.schema);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du schéma:', err);
    }
  };

  const loadHistory = () => {
    const saved = localStorage.getItem('sql_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem('sql_favorites');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  };

  // Auto-complétion intelligente
  const getSuggestions = useCallback((text, position) => {
    const words = text.substring(0, position).split(/\s+/);
    const currentWord = words[words.length - 1].toLowerCase();
    
    if (!currentWord) return [];

    const suggestions = [];

    // Suggestions de tables
    Object.keys(schema).forEach(table => {
      if (table.toLowerCase().includes(currentWord)) {
        suggestions.push({
          type: 'table',
          text: table,
          description: 'Table globale',
          icon: <Table size={14} />
        });
      }
    });

    // Suggestions de colonnes
    Object.entries(schema).forEach(([table, columns]) => {
      columns.forEach(col => {
        const columnName = col.name.toLowerCase();
        if (columnName.includes(currentWord)) {
          suggestions.push({
            type: 'column',
            text: col.name,
            description: `Colonne de ${table}`,
            icon: <Column size={14} />,
            table
          });
        }
      });
    });

    // Suggestions de mots-clés SQL
    const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT'];
    
    keywords.forEach(keyword => {
      if (keyword.toLowerCase().startsWith(currentWord)) {
        suggestions.push({
          type: 'keyword',
          text: keyword,
          description: 'Mot-clé SQL',
          icon: <Zap size={14} />
        });
      }
    });

    return suggestions.slice(0, 8);
  }, [schema]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    
    setQuery(value);
    setCursorPosition(position);
    
    // Obtenir les suggestions
    const newSuggestions = getSuggestions(value, position);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
    
    // Validation syntaxique simple
    validateSyntax(value);
  };

  const validateSyntax = (text) => {
    // Validation syntaxique basique
    const upperText = text.toUpperCase().trim();
    
    if (!upperText) {
      setSyntaxError(null);
      return;
    }
    
    if (!upperText.startsWith('SELECT')) {
      setSyntaxError('Les requêtes doivent commencer par SELECT');
      return;
    }
    
    if (!upperText.includes('FROM')) {
      setSyntaxError('La clause FROM est manquante');
      return;
    }
    
    // Vérifier les parenthèses
    const openParens = (text.match(/\(/g) || []).length;
    const closeParens = (text.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      setSyntaxError('Parenthèses non équilibrées');
      return;
    }
    
    setSyntaxError(null);
  };

  const handleSuggestionClick = (suggestion) => {
    const words = query.substring(0, cursorPosition).split(/\s+/);
    const beforeCursor = query.substring(0, cursorPosition - words[words.length - 1].length);
    const afterCursor = query.substring(cursorPosition);
    
    const newQuery = beforeCursor + suggestion.text + afterCursor;
    setQuery(newQuery);
    setShowSuggestions(false);
    
    // Mettre le curseur après le mot inséré
    setTimeout(() => {
      if (editorRef.current) {
        const newPosition = beforeCursor.length + suggestion.text.length;
        editorRef.current.setSelectionRange(newPosition, newPosition);
        editorRef.current.focus();
      }
    }, 0);
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      warning('Veuillez entrer une requête SQL');
      return;
    }
    
    if (syntaxError) {
      error('Veuillez corriger les erreurs de syntaxe avant d\'exécuter');
      return;
    }
    
    setLoading(true);
    
    try {
      // Ajouter à l'historique
      const newHistory = [query, ...history.slice(0, 9)];
      setHistory(newHistory);
      localStorage.setItem('sql_history', JSON.stringify(newHistory));
      
      // Exécuter la requête
      await onExecute(query);
      success('Requête exécutée avec succès');
      
    } catch (err) {
      error('Erreur lors de l\'exécution de la requête');
    } finally {
      setLoading(false);
    }
  };

  const addToFavorites = () => {
    if (!query.trim()) return;
    
    const newFavorites = [query, ...favorites.filter(f => f !== query).slice(0, 9)];
    setFavorites(newFavorites);
    localStorage.setItem('sql_favorites', JSON.stringify(newFavorites));
    success('Requête ajoutée aux favoris');
  };

  const loadFromHistory = (item) => {
    setQuery(item);
    setShowHistory(false);
    setShowSuggestions(false);
  };

  const loadFromFavorites = (item) => {
    setQuery(item);
    setShowFavorites(false);
    setShowSuggestions(false);
  };

  const formatQuery = () => {
    // Formatage SQL simple
    let formatted = query
      .replace(/\s+/g, ' ')
      .replace(/\bSELECT\b/gi, 'SELECT\n  ')
      .replace(/\bFROM\b/gi, '\nFROM')
      .replace(/\bWHERE\b/gi, '\nWHERE')
      .replace(/\bJOIN\b/gi, '\nJOIN')
      .replace(/\bORDER BY\b/gi, '\nORDER BY')
      .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
      .replace(/\bHAVING\b/gi, '\nHAVING')
      .replace(/\bLIMIT\b/gi, '\nLIMIT')
      .replace(/,/g, ',\n  ');
    
    setQuery(formatted);
    success('Requête formatée');
  };

  return (
    <div className="smart-sql-editor">
      <Card variant="glass" className="editor-card">
        {/* Header */}
        <div className="editor-header">
          <div className="editor-title">
            <Code2 size={20} />
            <h3>Éditeur SQL Intelligent</h3>
          </div>
          
          <div className="editor-actions">
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
              <History size={16} />
              Historique
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowFavorites(!showFavorites)}>
              <Star size={16} />
              Favoris
            </Button>
            <Button variant="ghost" size="sm" onClick={formatQuery}>
              <Zap size={16} />
              Format
            </Button>
            <Button variant="ghost" size="sm" onClick={addToFavorites}>
              <Save size={16} />
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="editor-container">
          <div className="editor-wrapper">
            <textarea
              ref={editorRef}
              value={query}
              onChange={handleInputChange}
              placeholder="Entrez votre requête SQL ici..."
              className="sql-editor"
              spellCheck={false}
            />
            
            {/* Suggestions */}
            <AnimatePresence>
              {showSuggestions && (
                <div className="suggestions-dropdown" ref={suggestionsRef}>
                  {suggestions.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      className={`suggestion-item suggestion-${suggestion.type}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="suggestion-icon">
                        {suggestion.icon}
                      </div>
                      <div className="suggestion-content">
                        <div className="suggestion-text">{suggestion.text}</div>
                        <div className="suggestion-description">{suggestion.description}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Syntax Error */}
          {syntaxError && (
            <motion.div
              className="syntax-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={16} />
              <span>{syntaxError}</span>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="editor-footer">
          <div className="editor-info">
            <span className="query-length">{query.length} caractères</span>
            {syntaxError && (
              <span className="error-indicator">
                <AlertCircle size={14} />
                Erreur de syntaxe
              </span>
            )}
          </div>
          
          <div className="editor-controls">
            <Button
              variant="primary"
              onClick={executeQuery}
              disabled={loading || !query.trim() || !!syntaxError}
              loading={loading}
            >
              <Play size={16} />
              Exécuter
            </Button>
          </div>
        </div>
      </Card>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            className="history-panel"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
          >
            <Card variant="glass" className="history-card">
              <div className="history-header">
                <h4>Historique des requêtes</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                  <X size={16} />
                </Button>
              </div>
              <div className="history-list">
                {history.length > 0 ? (
                  history.map((item, index) => (
                    <div
                      key={index}
                      className="history-item"
                      onClick={() => loadFromHistory(item)}
                    >
                      <History size={14} />
                      <span className="history-text">
                        {item.length > 50 ? item.substring(0, 50) + '...' : item}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <Database size={32} />
                    <p>Aucun historique</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Favorites Panel */}
      <AnimatePresence>
        {showFavorites && (
          <motion.div
            className="favorites-panel"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
          >
            <Card variant="glass" className="favorites-card">
              <div className="favorites-header">
                <h4>Requêtes favorites</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowFavorites(false)}>
                  <X size={16} />
                </Button>
              </div>
              <div className="favorites-list">
                {favorites.length > 0 ? (
                  favorites.map((item, index) => (
                    <div
                      key={index}
                      className="favorite-item"
                      onClick={() => loadFromFavorites(item)}
                    >
                      <Star size={14} />
                      <span className="favorite-text">
                        {item.length > 50 ? item.substring(0, 50) + '...' : item}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <Star size={32} />
                    <p>Aucun favori</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartSQLEditor;
