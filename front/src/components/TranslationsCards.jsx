import { useApp } from "../context/AppContext";
import { apiJson, API_BASE } from "../lib/api";
import { useFilters } from "../hooks/useFilters";
import { LANGUAGES } from "../constants";
import "./TranslationsCards.css";

const TranslationsCards = () => {
  const { selectedLanguages, currentProject, dispatch, actions } = useApp();
  const { filteredTranslations } = useFilters();

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

  const handleDeleteTranslation = async (id) => {
    if (!window.confirm("Supprimer cette traduction ?")) return;
    try {
      await apiJson('/translations/' + id, { method: 'DELETE' });
      dispatch({ type: actions.REMOVE_TRANSLATION, payload: id });
    } catch (e) {
      alert('Erreur: ' + e.message);
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

    try {
      const data = await apiJson('/translate', {
        method: 'POST',
        body: JSON.stringify({ text: sourceText, source: fromLang, target: toLang, translation_id: translationId }),
      });
      dispatch({
        type: actions.UPDATE_TRANSLATION_VALUE,
        payload: { translationId, lang: toLang, value: data.translatedText || data.text },
      });
    } catch (e) {
      alert('Erreur de traduction: ' + e.message);
    }
  };

  const handleUpdateTranslationValue = async (translation, langCode, text) => {
    const valueId = translation.value_ids?.[langCode];
    try {
      if (valueId) {
        await apiJson('/values/' + valueId, {
          method: 'PUT',
          body: JSON.stringify({ text }),
        });
        dispatch({
          type: actions.UPDATE_TRANSLATION_VALUE,
          payload: { translationId: translation.id, lang: langCode, value: text },
        });
      } else {
        const created = await apiJson('/translations/' + translation.id + '/values', {
          method: 'POST',
          body: JSON.stringify({ lang: langCode, text }),
        });
        dispatch({
          type: actions.UPDATE_TRANSLATION_VALUE,
          payload: { translationId: translation.id, lang: langCode, value: text, valueId: created.id },
        });
      }
    } catch (e) {
      alert('Erreur: ' + e.message);
    }
  };

  const handleExportTranslations = async () => {
    if (!currentProject) return;
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${API_BASE}/projects/${currentProject.id}/export/zip`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.slug || currentProject.id}-translations.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erreur export: ' + e.message);
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
    <div className="translations-cards">
      <div className="cards-header">
        <h3>🗃️ Vue Cartes ({filteredTranslations.length})</h3>
        <div className="cards-actions">
          <button
            className="export-btn"
            onClick={handleExportTranslations}
          >
            📥 Exporter
          </button>
        </div>
      </div>

      <div className="cards-grid">
        {filteredTranslations.map((translation) => {
          const status = getCompletionStatus(translation);
          return (
            <div key={translation.id} className="translation-card">
              <div className="card-header">
                <div className="card-key">
                  <span className="key-icon">🔑</span>
                  <span className="key-text">{translation.key}</span>
                </div>
                <div className="card-actions">
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteTranslation(translation.id)}
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="card-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${status.percentage}%` }}
                  />
                </div>
                <span className="progress-text">
                  {status.completed}/{status.total} langues ({status.percentage}
                  %)
                </span>
              </div>

              <div className="card-translations">
                {selectedLanguages.map((langCode) => {
                  const lang = getLanguageInfo(langCode);
                  const value = translation.values?.[langCode] || "";
                  const isEmpty = !value.trim();

                  return (
                    <div
                      key={langCode}
                      className={`translation-item ${isEmpty ? "empty" : ""}`}
                    >
                      <div className="language-header">
                        <span className="lang-flag">{lang?.flag}</span>
                        <span className="lang-name">{lang?.name}</span>
                        <span className="lang-code">
                          {langCode.toUpperCase()}
                        </span>
                      </div>

                      <div className="translation-content">
                        {isEmpty ? (
                          <div className="empty-translation">
                            <span className="empty-text">
                              Traduction manquante
                            </span>
                            <div className="auto-translate-buttons">
                              {selectedLanguages
                                .filter(
                                  (sourceLang) =>
                                    sourceLang !== langCode &&
                                    translation.values?.[sourceLang],
                                )
                                .map((sourceLang) => (
                                  <button
                                    key={sourceLang}
                                    className="auto-translate-btn"
                                    onClick={() =>
                                      handleAutoTranslate(
                                        translation.id,
                                        sourceLang,
                                        langCode,
                                      )
                                    }
                                    title={`Traduire depuis ${sourceLang.toUpperCase()}`}
                                  >
                                    {getLanguageInfo(sourceLang)?.flag} → ✨
                                  </button>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <div className="translation-value">
                            <textarea
                              value={value}
                              onChange={(e) =>
                                handleUpdateTranslationValue(
                                  translation,
                                  langCode,
                                  e.target.value,
                                )
                              }
                              className="value-input"
                              rows="2"
                              placeholder={`Traduction ${langCode}...`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card-footer">
                <small className="card-meta">
                  📁 {translation.project} • Créé:{" "}
                  {new Date(translation.created_at).toLocaleDateString()} •
                  Modifié:{" "}
                  {new Date(translation.updated_at).toLocaleDateString()}
                </small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TranslationsCards;
