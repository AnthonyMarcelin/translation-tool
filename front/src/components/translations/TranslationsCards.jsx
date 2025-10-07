import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useTranslationApi } from "../../hooks/useTranslationApi";
import { useFilters } from "../../hooks/useFilters";
import { LANGUAGES } from "../../constants";
import {
  CheckIcon,
  Cross2Icon,
  FileTextIcon,
  LayersIcon,
  DownloadIcon,
  PaperPlaneIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import "./TranslationsCards.css";
import "./dark-mode-overrides.css";

const TranslationsCards = () => {
  const { selectedLanguages, currentProject, actions, translations } = useApp();
  const translationApi = useTranslationApi();
  const { filteredTranslations } = useFilters();

  const getLanguageInfo = (langCode) => LANGUAGES.find((lang) => lang.code === langCode);

  const getCompletionStatus = (translation) => {
    const completedLanguages = LANGUAGES.filter(lang => 
      selectedLanguages.includes(lang.code) && 
      translation.values?.[lang.code]?.trim()
    ).length;

    return {
      total: selectedLanguages.length,
      percentage: Math.round((completedLanguages / selectedLanguages.length) * 100),
    };
  };

  const [editingKey, setEditingKey] = useState(null);
  const [editKeyValue, setEditKeyValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const startEditKey = (translation) => {
    setEditingKey(translation.id);
    setEditKeyValue(translation.key);
  };

  const saveEditKey = async (translationId) => {
    if (isSaving || !editKeyValue.trim() || !currentProject?.id) return;

    setIsSaving(true);
    try {
      await translationApi.updateTranslation(translationId, editKeyValue.trim(), currentProject.id);

      const localUpdated = {
        id: translationId,
        key: editKeyValue.trim(),
        project: currentProject.id,
        values: translations.find(t => t.id === translationId)?.values || {}
      };

      const updatedTranslations = translations.map(t =>
        t.id === translationId ? localUpdated : t
      );

      actions.setTranslations([...updatedTranslations]);

      setEditingKey(null);
      setEditKeyValue("");
    } catch (error) {
      console.error("Error saving key:", error);
      alert("Failed to save key. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyKeyDown = (e, translationId) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditKey(translationId);
    } else if (e.key === "Escape") {
      setEditingKey(null);
      setEditKeyValue("");
    }
  };

  const handleAutoTranslate = async (translationId, fromLang, toLang) => {
    const translation = filteredTranslations.find((t) => t.id === translationId);
    const sourceText = translation?.values?.[fromLang];
    if (!sourceText) return alert(`Aucun texte source en ${fromLang.toUpperCase()}`);

    try {
      const result = await translationApi.autoTranslate(translationId, fromLang, toLang, sourceText);

      if (result?.translatedText) {
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
      actions.removeTranslation(translationId);
    } catch (error) {
      console.error("Error deleting translation:", error);
    }
  };

  const handleChangeValue = (translationId, lang, value) => {
    actions.updateTranslationValue(translationId, lang, value);
    translationApi.updateTranslationValue(translationId, lang, value);
  };

  const exportTranslations = async () => {
    if (!currentProject?.id) return;
    await translationApi.exportTranslations(currentProject.id, selectedLanguages);
  };

  if (filteredTranslations.length === 0) {
    return (
      <div className="empty-translations">
        <div className="empty-icon"><FileTextIcon /></div>
        <h3>Aucune traduction trouvée</h3>
        <p>Ajoutez votre première traduction pour commencer.</p>
      </div>
    );
  }

 
  return (
    <div className="translations-cards">
      <div className="cards-header">
        <h3><LayersIcon /> Vue Cartes ({filteredTranslations.length})</h3>
        <div className="cards-actions">
          <button className="export-btn" onClick={exportTranslations}>
            <DownloadIcon /> Exporter
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
                  {editingKey === translation.id ? (
                    <div className="key-edit-container">
                      <input
                        type="text"
                        value={editKeyValue}
                        onChange={(e) => setEditKeyValue(e.target.value)}
                        onKeyDown={(e) => handleKeyKeyDown(e, translation.id)}
                        autoFocus
                        className="key-edit-input"
                        disabled={isSaving}
                      />
                      <div className="key-edit-actions">
                        <button 
                          onClick={() => saveEditKey(translation.id)}
                          disabled={!editKeyValue.trim() || isSaving}
                        >
                          {isSaving ? 'Enregistrement...' : <CheckIcon />}
                        </button>
                        <button 
                          onClick={() => {
                            setEditingKey(null);
                            setEditKeyValue("");
                          }}
                          disabled={isSaving}
                        >
                          <Cross2Icon />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="key-icon"><PaperPlaneIcon /></span>
                      <span
                        className="key-text"
                        onClick={() => startEditKey(translation)}
                        style={{cursor: 'pointer'}}
                      >
                        {translation.key}
                      </span>

                    </>
                  )}
                </div>
                <div className="card-actions">
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteTranslation(translation.id)}
                    title="Supprimer"
                  >
                    <TrashIcon />
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
                {LANGUAGES.filter(lang => selectedLanguages.includes(lang.code)).map((lang) => {
                  const value = translation.values?.[lang.code] || "";
                  const isEmpty = !value.trim();

                  return (
                    <div key={lang.code} className={`translation-item ${isEmpty ? "empty" : ""}`}>
                      <div className="language-header">
                        <span className="lang-flag">{lang.flag}</span>
                        <span className="lang-name">{lang.name}</span>
                        <span className="lang-code">{lang.code.toUpperCase()}</span>
                      </div>

                      <div className="translation-content">
                        {isEmpty ? (
                          <div className="empty-translation">
                            <span className="empty-text">Traduction manquante</span>
                            <div className="auto-translate-buttons">
                              {LANGUAGES.filter(sourceLang => 
                                selectedLanguages.includes(sourceLang.code) && 
                                sourceLang.code !== lang.code &&
                                translation.values?.[sourceLang.code]
                              ).map((sourceLang) => (
                                  <button
                                    key={sourceLang.code}
                                    className="auto-translate-btn"
                                    onClick={() => handleAutoTranslate(translation.id, sourceLang.code, lang.code)}
                                    title={`Traduire depuis ${sourceLang.code.toUpperCase()}`}
                                  >
                                    {sourceLang.flag} → ✨
                                  </button>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <div className="translation-value">
                            <textarea
                              value={value}
                              onChange={(e) => handleChangeValue(translation.id, lang.code, e.target.value)}
                              className="value-input"
                              rows="2"
                              placeholder={`Traduction ${lang.code}...`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card-footer">
              
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TranslationsCards;
