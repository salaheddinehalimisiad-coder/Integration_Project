import { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Création du Context pour le store global
const StoreContext = createContext(null);

const DEFAULT_RULES = [
  { id: 'highest_confidence', name: 'Confiance des sources', desc: 'Prioriser la valeur de la source ayant le plus grand indice de confiance.', active: true },
  { id: 'transitive_closure', name: 'Fermeture transitive', desc: 'Résoudre les équivalences indirectes (si A~B et B~C alors A~C) par Union-Find.', active: true },
  { id: 'soundex_match', name: 'Soundex & Phonétique', desc: 'Regrouper les noms avec une prononciation similaire en français/arabe.', active: true },
  { id: 'value_merge', name: 'Concaténation des compétences', desc: 'Fusionner les listes de compétences (S6) plutôt que de les remplacer.', active: true },
];

export function StoreProvider({ children }) {
  // 1. Historique des requêtes SQL
  const [queryHistory, setQueryHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('dm_query_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 2. Gestion des règles de résolution de conflits
  const [resolutionRules, setResolutionRules] = useState(() => {
    try {
      const saved = localStorage.getItem('dm_conflict_rules');
      return saved ? JSON.parse(saved) : DEFAULT_RULES;
    } catch {
      return DEFAULT_RULES;
    }
  });

  // 3. Stockage des gros objets JSON de médiation retournés
  const [queryResults, setQueryResults] = useState(null);
  const [explainPlan, setExplainPlan] = useState(null);

  // Sauvegarde automatique de l'historique dans localStorage
  useEffect(() => {
    localStorage.setItem('dm_query_history', JSON.stringify(queryHistory));
  }, [queryHistory]);

  // Sauvegarde automatique des règles dans localStorage
  useEffect(() => {
    localStorage.setItem('dm_conflict_rules', JSON.stringify(resolutionRules));
  }, [resolutionRules]);

  // Action: Ajouter une requête SQL à l'historique (sans doublon consécutif)
  const addQueryToHistory = useCallback((sql) => {
    if (!sql || !sql.trim()) return;
    setQueryHistory((prev) => {
      const filtered = prev.filter((q) => q !== sql);
      return [sql, ...filtered].slice(0, 50); // Garder les 50 dernières requêtes
    });
  }, []);

  // Action: Nettoyer l'historique
  const clearQueryHistory = useCallback(() => {
    setQueryHistory([]);
  }, []);

  // Action: Activer/Désactiver une règle de conflit
  const toggleResolutionRule = useCallback((ruleId) => {
    setResolutionRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
    );
  }, []);

  // Action: Changer la priorité d'une règle (déplacer vers le haut ou bas)
  const moveResolutionRule = useCallback((index, direction) => {
    setResolutionRules((prev) => {
      const nextRules = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= nextRules.length) return prev;
      const temp = nextRules[index];
      nextRules[index] = nextRules[targetIndex];
      nextRules[targetIndex] = temp;
      return nextRules;
    });
  }, []);

  // Action: Réinitialiser les règles de conflit par défaut
  const resetResolutionRules = useCallback(() => {
    setResolutionRules(DEFAULT_RULES);
  }, []);

  const value = {
    queryHistory,
    addQueryToHistory,
    clearQueryHistory,
    resolutionRules,
    setResolutionRules,
    toggleResolutionRule,
    moveResolutionRule,
    resetResolutionRules,
    queryResults,
    setQueryResults,
    explainPlan,
    setExplainPlan,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// Hook personnalisé pour consommer le store global
export function useStore() {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore doit être utilisé à l\'intérieur de StoreProvider');
  }
  return store;
}
