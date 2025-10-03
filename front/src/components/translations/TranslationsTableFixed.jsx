import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useFilters } from "../../hooks/useFilters";
import { LANGUAGES } from "../../constants";
import "./TranslationsTable.css";

const TranslationsTable = () => {
  const { selectedLanguages, actions } = useApp();
  const { filteredTranslations } = useFilters();
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (translationId, lang) => {
    const translation = filteredTranslations.find(
      (t) => t.id === translationId
    );
    const currentValue = translation?.values?.[lang] || "";
    setEditingCell(`${translationId}-${lang}`);
    setEditValue(currentValue);
  };

  const saveEdit = async (translationId, lang) => {
    try {
      // Vérifier si la valeur existe déjà
      const valuesResponse = await fetch(
        `http://localhost:3001/translations/${translationId}/values`
      );
      const existingValues = await valuesResponse.json();
      const existingValue = existingValues.find((v) => v.lang === lang);

      if (existingValue) {
        await fetch(`http://localhost:3001/values/${existingValue.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: editValue }),
        });
      } else {
        await fetch(
          `http://localhost:3001/translations/${translationId}/values`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lang, text: editValue }),
          }
        );
      }

      actions.updateTranslationValue(translationId, lang, editValue);
    } catch (error) {
      console.error("Error updating translation value:", error);
    }

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
    const translation = filteredTranslations.find(
      (t) => t.id === translationId
    );
    const sourceText = translation?.values?.[fromLang];
    if (!sourceText) return alert(`Aucun texte source en ${fromLang.toUpperCase()}`);

    try {
      const response = await fetch("http://localhost:3001/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          source: fromLang,
          target: toLang,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();

      if (result.translatedText) {
        actions.updateTranslationValue(translationId, toLang, result.translatedText);

        await fetch(
          `http://localhost:3001/translations/${translationId}/values`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lang: toLang, text: result.translatedText }),
          }
        );
      }
    } catch (error) {
      console.error("Auto-translation error:", error);
      alert(`Erreur de traduction: ${error.message}`);
    }
  };

  const handleDeleteTranslation = async (translationId) => {
    if (!window.confirm("Supprimer cette traduction ?")) return;

    try {
      await fetch(`http://localhost:3001/translations/${translationId}`, {
        method: "DELETE",
      });
      actions.removeTranslation(translationId);
    } catch (error) {
      console.error("Error deleting translation:", error);
    }
  };

  const getLanguageInfo = (langCode) => LANGUAGES.find((lang) => lang.code === langCode);

  const exportTranslations = async () => {
    const currentProject = filteredTranslations[0]?.project;
    if (!currentProject) return;

    try {
      const url = `http://localhost:3001/export/project/${currentProject}/zip`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erreur lors de l'export");

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${currentProject}-translations.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Export error:", error);
    }
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
          <button className="export-btn" onClick={exportTranslations}>
            📥 Exporter
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="translations-table">
          <thead>
            <tr>
              <th className="key-column">Clé</th>
              {selectedLanguages.map((langCode) => {
                const lang = getLanguageInfo(langCode);
                return (
                  <th key={langCode} className="lang-column">
                    <div className="lang-header">
                      <span className="lang-flag">{lang?.flag}</span>
                      <span className="lang-name">{lang?.name}</span>
                      <span className="lang-code">{langCode.toUpperCase()}</span>
                    </div>
                  </th>
                );
              })}
              <th className="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTranslations.slice(0, 50).map((translation) => (
              <tr key={translation.id} className="translation-row">
                <td className="key-cell">
                  <div className="key-content">
                    <span className="key-text">{translation.key}</span>
                    <div className="key-meta">
                      <small>📁 {translation.project}</small>
                    </div>
                  </div>
                </td>

                {selectedLanguages.map((langCode) => {
                  const cellKey = `${translation.id}-${langCode}`;
                  const isEditing = editingCell === cellKey;
                  const value = translation.values?.[langCode] || "";
                  const isEmpty = !value.trim();

                  return (
                    <td key={langCode} className={`translation-cell ${isEmpty ? "empty" : ""}`}>
                      {isEditing ? (
                        <div className="edit-mode">
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, translation.id, langCode)}
                            onBlur={() => saveEdit(translation.id, langCode)}
                            className="edit-input"
                            rows="2"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="cell-content" onClick={() => startEdit(translation.id, langCode)}>
                          {isEmpty ? (
                            <div className="empty-state">
                              <span className="empty-text">Cliquer pour saisir manuellement</span>
                              <div className="auto-translate-options">
                                {selectedLanguages
                                  .filter((lang) => lang !== langCode && translation.values?.[lang])
                                  .map((sourceLang) => (
                                    <button
                                      key={sourceLang}
                                      className="auto-translate-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAutoTranslate(translation.id, sourceLang, langCode);
                                      }}
                                      title={`Traduire depuis ${sourceLang.toUpperCase()} vers ${langCode.toUpperCase()}`}
                                    >
                                      {getLanguageInfo(sourceLang)?.flag} → {getLanguageInfo(langCode)?.flag}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          ) : (
                            <div className="value-display">
                              <span className="value-text">{value}</span>
                              <div className="cell-actions">
                                <button className="edit-btn" title="Éditer">✏️</button>
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
                      onClick={() => handleDeleteTranslation(translation.id)}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TranslationsTable;
