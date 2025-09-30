import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useFilters } from '../hooks/useFilters';
import { LANGUAGES } from '../constants';
import './TranslationsTable.css';

const TranslationsTable = () => {
  const { selectedLanguages } = useApp();
  const { filteredTranslations } = useFilters();
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [displayLimit, setDisplayLimit] = useState(50); // Limite d'affichage pour les performancestate } from 'react';
import { useApp } from '../context/AppContext';
import { useApi } from '../hooks/useApiOptimized';
import { useFilters } from '../hooks/useFilters';
import { LANGUAGES } from '../constants';
import './TranslationsTable.css';

const TranslationsTable = () => {
  const { selectedLanguages } = useApp();
  const api = useApi();
  const { filteredTranslations } = useFilters();
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (translationId, lang) => {
    const translation = filteredTranslations.find(
      (t) => t.id === translationId,
    );
    const currentValue = translation?.values?.[lang] || "";
    setEditingCell(`${translationId}-${lang}`);
    setEditValue(currentValue);
  };

  const saveEdit = async (translationId, lang) => {
    await api.updateTranslationValue(translationId, lang, editValue);
    setEditingCell(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e, translationId, lang) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(translationId, lang);
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

    const handleAutoTranslate = async (translationId, fromLang, toLang) => {
    const translation = filteredTranslations.find(t => t.id === translationId);
    const sourceText = translation?.values?.[fromLang];
    
    if (!sourceText) {
      alert(`Aucun texte source en ${fromLang.toUpperCase()}`);
      return;
    }

    // Optimisation : ne pas attendre la réponse pour l'UX
    api.autoTranslate(translationId, fromLang, toLang, sourceText);
  };

  const getLanguageInfo = (langCode) => {
    return LANGUAGES.find((lang) => lang.code === langCode);
  };

  const getCompletionStatus = (translation) => {
    const completedLanguages = selectedLanguages.filter((lang) =>
      translation.values?.[lang]?.trim(),
    ).length;
    return {
      completed: completedLanguages,
      total: selectedLanguages.length,
      percentage: Math.round(
        (completedLanguages / selectedLanguages.length) * 100,
      ),
    };
  };

  if (filteredTranslations.length === 0) {
    return (
      <div className="empty-translations">
        <div className="empty-icon">📝</div>
        <h3>Aucune traduction trouvée</h3>
        <p>Ajoutez votre première traduction pour commencer.</p>
      </div>
    );
  }

  return (
    <div className="translations-table-container">
      <div className="table-header">
        <h3>📊 Traductions ({filteredTranslations.length})</h3>
        <div className="table-actions">
          <button
            className="export-btn"
            onClick={() =>
              api.exportTranslations(
                filteredTranslations[0]?.project,
                selectedLanguages,
              )
            }
          >
            📥 Exporter
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="translations-table">
          <thead>
            <tr>
              <th className="key-column">Clé</th>
              <th className="progress-column">Progression</th>
              {selectedLanguages.map((langCode) => {
                const lang = getLanguageInfo(langCode);
                return (
                  <th key={langCode} className="lang-column">
                    <div className="lang-header">
                      <span className="lang-flag">{lang?.flag}</span>
                      <span className="lang-name">{lang?.name}</span>
                      <span className="lang-code">
                        {langCode.toUpperCase()}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th className="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTranslations.map((translation) => {
              const status = getCompletionStatus(translation);
              return (
                <tr key={translation.id} className="translation-row">
                  <td className="key-cell">
                    <div className="key-content">
                      <span className="key-text">{translation.key}</span>
                      <div className="key-meta">
                        <small>📁 {translation.project}</small>
                      </div>
                    </div>
                  </td>

                  <td className="progress-cell">
                    <div className="progress-info">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${status.percentage}%` }}
                        />
                      </div>
                      <span className="progress-text">
                        {status.completed}/{status.total}
                      </span>
                    </div>
                  </td>

                  {selectedLanguages.map((langCode) => {
                    const cellKey = `${translation.id}-${langCode}`;
                    const isEditing = editingCell === cellKey;
                    const value = translation.values?.[langCode] || "";
                    const isEmpty = !value.trim();

                    return (
                      <td
                        key={langCode}
                        className={`translation-cell ${isEmpty ? "empty" : ""}`}
                      >
                        {isEditing ? (
                          <div className="edit-mode">
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) =>
                                handleKeyDown(e, translation.id, langCode)
                              }
                              onBlur={() => saveEdit(translation.id, langCode)}
                              className="edit-input"
                              rows="2"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div
                            className="cell-content"
                            onClick={() => startEdit(translation.id, langCode)}
                          >
                            {isEmpty ? (
                              <div className="empty-state">
                                <span className="empty-text">
                                  Cliquer pour traduire
                                </span>
                                <div className="auto-translate-options">
                                  {selectedLanguages
                                    .filter(
                                      (lang) =>
                                        lang !== langCode &&
                                        translation.values?.[lang],
                                    )
                                    .map((sourceLang) => (
                                      <button
                                        key={sourceLang}
                                        className="auto-translate-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAutoTranslate(
                                            translation.id,
                                            sourceLang,
                                            langCode,
                                          );
                                        }}
                                        title={`Traduire depuis ${sourceLang.toUpperCase()}`}
                                      >
                                        {getLanguageInfo(sourceLang)?.flag} → ✨
                                      </button>
                                    ))}
                                </div>
                              </div>
                            ) : (
                              <div className="value-display">
                                <span className="value-text">{value}</span>
                                <div className="cell-actions">
                                  <button className="edit-btn" title="Éditer">
                                    ✏️
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className="actions-cell">
                    <div className="row-actions">
                      <button
                        className="delete-btn"
                        onClick={() => {
                          if (window.confirm("Supprimer cette traduction ?")) {
                            api.deleteTranslation(translation.id);
                          }
                        }}
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TranslationsTable;
