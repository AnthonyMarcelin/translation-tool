import { useApp } from "../../context/AppContext";
import { useTranslationApi } from "../../hooks/useTranslationApi";
import { useFilters } from "../../hooks/useFilters";
import { LANGUAGES } from "../../constants";
import "./TranslationsCards.css";

const TranslationsCards = () => {
  const { selectedLanguages, actions } = useApp();
  const translationApi = useTranslationApi();
  const { filteredTranslations } = useFilters();

  const getLanguageInfo = (langCode) => LANGUAGES.find((lang) => lang.code === langCode);

  const getCompletionStatus = (translation) => {
    const completedLanguages = selectedLanguages.filter((lang) =>
      translation.values?.[lang]?.trim()
    ).length;

    return {
      completed: completedLanguages,
      total: selectedLanguages.length,
      percentage: Math.round((completedLanguages / selectedLanguages.length) * 100),
    };
  };

  const handleAutoTranslate = async (translationId, fromLang, toLang) => {
    const translation = filteredTranslations.find((t) => t.id === translationId);
    const sourceText = translation?.values?.[fromLang];
    if (!sourceText) return alert(`Aucun texte source en ${fromLang.toUpperCase()}`);

    try {
      const result = await translationApi.autoTranslate(translationId, fromLang, toLang, sourceText);

      if (result?.translatedText) {
        // Mettre à jour le state via action creator
        actions.updateTranslationValue(translationId, toLang, result.translatedText);
      }
    } catch (error) {
      console.error("Auto-translation error:", error);
      alert(`Erreur de traduction: ${error.message}`);
    }
  };

  const handleDeleteTranslation = async (translationId) => {
    if (!window.confirm("Supprimer cette traduction ?")) return;

    try {
      await translationApi.deleteTranslation(translationId);
      // Supprimer du state
      actions.removeTranslation(translationId);
    } catch (error) {
      console.error("Error deleting translation:", error);
    }
  };

  const handleChangeValue = (translationId, lang, value) => {
    // Mise à jour locale immédiate
    actions.updateTranslationValue(translationId, lang, value);

    // Envoi au backend via API
    translationApi.updateTranslationValue(translationId, lang, value);
  };

  const exportTranslations = async () => {
    const currentProject = filteredTranslations[0]?.project;
    if (!currentProject) return;
    await translationApi.exportTranslations(currentProject, selectedLanguages);
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
          <button className="export-btn" onClick={exportTranslations}>
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
                  <div className="progress-fill" style={{ width: `${status.percentage}%` }} />
                </div>
                <span className="progress-text">
                  {status.completed}/{status.total} langues ({status.percentage}%)
                </span>
              </div>

              <div className="card-translations">
                {selectedLanguages.map((langCode) => {
                  const lang = getLanguageInfo(langCode);
                  const value = translation.values?.[langCode] || "";
                  const isEmpty = !value.trim();

                  return (
                    <div key={langCode} className={`translation-item ${isEmpty ? "empty" : ""}`}>
                      <div className="language-header">
                        <span className="lang-flag">{lang?.flag}</span>
                        <span className="lang-name">{lang?.name}</span>
                        <span className="lang-code">{langCode.toUpperCase()}</span>
                      </div>

                      <div className="translation-content">
                        {isEmpty ? (
                          <div className="empty-translation">
                            <span className="empty-text">Traduction manquante</span>
                            <div className="auto-translate-buttons">
                              {selectedLanguages
                                .filter(
                                  (sourceLang) =>
                                    sourceLang !== langCode &&
                                    translation.values?.[sourceLang]
                                )
                                .map((sourceLang) => (
                                  <button
                                    key={sourceLang}
                                    className="auto-translate-btn"
                                    onClick={() => handleAutoTranslate(translation.id, sourceLang, langCode)}
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
                              onChange={(e) => handleChangeValue(translation.id, langCode, e.target.value)}
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
                  Modifié: {new Date(translation.updated_at).toLocaleDateString()}
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
