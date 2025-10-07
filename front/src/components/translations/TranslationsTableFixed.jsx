import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useTranslationApi } from "../../hooks/useTranslationApi";
import { LANGUAGES } from "../../constants";
import { CheckIcon, Cross2Icon, TrashIcon, DownloadIcon } from "@radix-ui/react-icons";
import "./TranslationsTable.css";
import "./dark-mode-overrides.css";

const TranslationsTable = () => {
  const { selectedLanguages, translations, currentProject, actions } = useApp();
  const translationApi = useTranslationApi();
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editingKey, setEditingKey] = useState(null);
  const [editKeyValue, setEditKeyValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const startEditKey = (translationId) => {
    const translation = translations.find((t) => t.id === translationId);
    setEditingKey(translationId);
    setEditKeyValue(translation.key);
  };
  
  const startEditValue = (translationId, lang) => {
    const currentValue = translation?.values?.[lang] || "";
    setEditingCell(`${translationId}-${lang}`);
    setEditValue(currentValue);
  };

  const exportTranslations = async () => {
    if (!currentProject?.id) return;
    await translationApi.exportTranslations(currentProject.id, selectedLanguages);
  };

  const handleChangeValue = (translationId, lang, value) => {
    actions.updateTranslationValue(translationId, lang, value);
    translationApi.updateTranslationValue(translationId, lang, value);
  };

  const handleKeyDown = (e, translationId, lang) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(translationId, lang);
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleKeyDownRenameKey = (e, translationId) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditKey(translationId);
    } else if (e.key === "Escape") {
      setEditingKey(null);
      setEditKeyValue("");
    }
  };

  if (!translations || translations.length === 0) {
    return (
      <div className="no-translations">
        <p>Aucune traduction trouvée. Ajoutez une nouvelle traduction pour commencer.</p>
      </div>
    );
  }

  return (
    <div className="translations-table-container">
      <div className="table-header">
        <h3>Vue Tableau ({translations.length})</h3>
        <div className="table-actions">
          <button className="export-btn" onClick={exportTranslations}>
            <DownloadIcon /> Exporter JSON
          </button>
        </div>
      </div>
      <table className="translations-table">
        <thead>
          <tr>
            <th className="key-column">Clé</th>
            {LANGUAGES.filter(lang => selectedLanguages.includes(lang.code)).map((lang) => (
              <th key={lang.code} className="language-column">
                {lang.flag || lang.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {translations.map((translation) => (
            <tr key={translation.id}>
              <td className="key-cell">
                {editingKey === translation.id ? (
                  <div className="editing-cell">
                    <input
                      type="text"
                      value={editKeyValue}
                      onChange={(e) => setEditKeyValue(e.target.value)}
                      onKeyDown={(e) => handleKeyDownRenameKey(e, translation.id)}
                      autoFocus
                      disabled={isSaving}
                    />
                    <div className="edit-actions">
                      <button 
                        onClick={() => saveEditKey(translation.id)}
                        disabled={isSaving || !editKeyValue.trim()}
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
                  <div className="key-content">
                    <span 
                      className="key-text" 
                      onClick={() => startEditKey(translation.id)}
                      style={{cursor: 'pointer'}}
                    >
                      {translation.key}
                    </span>
                    <div className="key-actions">
                      <button 
                        className="delete-key-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTranslation(translation.id);
                        }}
                        title="Supprimer la traduction"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                )}
              </td>
              {LANGUAGES.filter(lang => selectedLanguages.includes(lang.code)).map((lang) => {
                const cellId = `${translation.id}-${lang.code}`;
                const isEditing = editingCell === cellId;
                const value = translation.values?.[lang.code] || "";
                
                return (
                  <td key={lang.code} className="translation-cell">
                    {isEditing ? (
                      <div className="editing-cell">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, translation.id, lang.code)}
                          autoFocus
                          disabled={isSaving}
                        />
                        <div className="edit-actions">
                          <button 
                            onClick={() => saveEdit(translation.id, lang.code)}
                            disabled={isSaving}
                          >
                            {isSaving ? 'Enregistrement...' : <CheckIcon />}
                          </button>
                          <button 
                            onClick={() => {
                              setEditingCell(null);
                              setEditValue("");
                            }}
                            disabled={isSaving}
                          >
                            <Cross2Icon />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="translation-content"
                        onClick={() => startEditValue(translation.id, lang)}
                      >
                        {value || <span className="empty-translation">(vide)</span>}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TranslationsTable;