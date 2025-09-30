import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useFilters } from "../hooks/useFilters";
import { LANGUAGES } from "../constants";
import "./TranslationsTable.css";

const TranslationsTable = () => {
  const { selectedLanguages, dispatch, actions } = useApp();
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
    try {
      // Trouver l'ID de la valeur existante ou créer une nouvelle
      const valuesResponse = await fetch(
        `http://localhost:3001/translations/${translationId}/values`,
      );
      const existingValues = await valuesResponse.json();
      const existingValue = existingValues.find((v) => v.lang === lang);

      if (existingValue) {
        // Mettre à jour
        await fetch(`http://localhost:3001/values/${existingValue.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: editValue }),
        });
      } else {
        // Créer nouveau
        await fetch(
          `http://localhost:3001/translations/${translationId}/values`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lang, text: editValue }),
          },
        );
      }

      // Mettre à jour l'état local
      dispatch({
        type: actions.UPDATE_TRANSLATION_VALUE,
        payload: { translationId, lang, value: editValue },
      });
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
      (t) => t.id === translationId,
    );
    const sourceText = translation?.values?.[fromLang];

    if (!sourceText) {
      alert(`Aucun texte source en ${fromLang.toUpperCase()}`);
      return;
    }

    console.log("🚀 Auto-translation:", {
      translationId,
      fromLang,
      toLang,
      sourceText,
    });

    try {
      const response = await fetch("http://localhost:3001/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          source: fromLang,
          target: toLang,
          // Ne pas passer translation_id pour éviter l'enregistrement automatique
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("✅ Translation result:", result);

      if (result.translatedText) {
        // Mettre à jour l'état local
        dispatch({
          type: actions.UPDATE_TRANSLATION_VALUE,
          payload: {
            translationId,
            lang: toLang,
            value: result.translatedText,
          },
        });
        console.log("✅ State updated");

        // Aussi enregistrer en base de données
        try {
          const saveResponse = await fetch(
            `http://localhost:3001/translations/${translationId}/values`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lang: toLang,
                text: result.translatedText,
              }),
            },
          );
          if (!saveResponse.ok) {
            console.warn("Failed to save to database:", saveResponse.status);
          }
        } catch (saveError) {
          console.warn("Save to DB failed:", saveError);
        }
      }
    } catch (error) {
      console.error("❌ Auto-translation error:", error);
      alert(`Erreur de traduction: ${error.message}`);
    }
  };

  const handleDeleteTranslation = async (translationId) => {
    if (!window.confirm("Supprimer cette traduction ?")) return;

    try {
      await fetch(`http://localhost:3001/translations/${translationId}`, {
        method: "DELETE",
      });
      dispatch({ type: actions.REMOVE_TRANSLATION, payload: translationId });
    } catch (error) {
      console.error("Error deleting translation:", error);
    }
  };

  const getLanguageInfo = (langCode) => {
    return LANGUAGES.find((lang) => lang.code === langCode);
  };

  const exportTranslations = async () => {
    const currentProject = filteredTranslations[0]?.project;
    if (!currentProject) return;

    try {
      const response = await fetch(
        `http://localhost:3001/export/project/${currentProject}?langs=${selectedLanguages.join(
          ",",
        )}`,
      );
      const data = await response.json();

      // Télécharger les fichiers
      Object.entries(data).forEach(([lang, translations]) => {
        const blob = new Blob([JSON.stringify(translations, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${lang}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
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
