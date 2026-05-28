import { useState } from "react";
import { useApp } from "../context/AppContext";
import { apiJson } from "../lib/api";
import "./AddTranslationForm.css";

const AddTranslationForm = () => {
  const { currentProject, projectLanguages, selectedLanguages, dispatch, actions } = useApp();
  const [newKey, setNewKey] = useState("");
  const [sourceValue, setSourceValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sourceLang = projectLanguages.find(l => l.is_source)?.lang_code || selectedLanguages[0] || "fr";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newKey.trim() || !sourceValue.trim() || !currentProject?.id) return;

    setIsLoading(true);
    try {
      // 1. Create the key
      const keyData = await apiJson(`/projects/${currentProject.id}/translations`, {
        method: "POST",
        body: JSON.stringify({ key: newKey.trim() }),
      });
      const translationId = keyData.id;

      // 2. Add source language value
      await apiJson(`/translations/${translationId}/values`, {
        method: "POST",
        body: JSON.stringify({ lang: sourceLang, text: sourceValue.trim() }),
      });

      // 3. Auto-translate to other selected languages
      const otherLanguages = selectedLanguages.filter(l => l !== sourceLang);
      const values = { [sourceLang]: sourceValue.trim() };

      await Promise.allSettled(
        otherLanguages.map(async (targetLang) => {
          try {
            const result = await apiJson("/translate", {
              method: "POST",
              body: JSON.stringify({
                text: sourceValue.trim(),
                source: sourceLang,
                target: targetLang,
                translation_id: translationId,
              }),
            });
            values[targetLang] = result.translatedText || "";
          } catch {
            values[targetLang] = "";
          }
        })
      );

      dispatch({
        type: actions.ADD_TRANSLATION,
        payload: {
          id: translationId,
          key: newKey.trim(),
          project_id: currentProject.id,
          values,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      setNewKey("");
      setSourceValue("");
    } catch (error) {
      alert(error.message || "Erreur lors de la création");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentProject) return null;

  const sourceLangInfo = projectLanguages.find(l => l.lang_code === sourceLang);

  return (
    <div className="add-translation-form">
      <h3>➕ Ajouter une nouvelle traduction</h3>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <div className="input-group">
            <label htmlFor="key-input">Clé de traduction</label>
            <input
              id="key-input"
              type="text"
              placeholder="ex: welcome.title"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="form-input"
              disabled={isLoading}
            />
          </div>
          <div className="input-group">
            <label htmlFor="source-input">Texte en {sourceLang.toUpperCase()} (langue source)</label>
            <input
              id="source-input"
              type="text"
              placeholder={`Texte en ${sourceLang.toUpperCase()}...`}
              value={sourceValue}
              onChange={(e) => setSourceValue(e.target.value)}
              className="form-input"
              disabled={isLoading}
            />
          </div>
          <div className="submit-group">
            <button
              type="submit"
              disabled={!newKey.trim() || !sourceValue.trim() || isLoading}
              className={`submit-btn ${isLoading ? "loading" : ""}`}
            >
              {isLoading ? <><span className="spinner"></span>Création...</> : <>✨ Créer + Auto-traduire</>}
            </button>
          </div>
        </div>
        <div className="auto-translate-info">
          <span className="info-icon">ℹ️</span>
          <span>
            Traduction automatique vers :{" "}
            {selectedLanguages.filter(l => l !== sourceLang).join(", ").toUpperCase() || "aucune autre langue sélectionnée"}
          </span>
        </div>
      </form>
    </div>
  );
};

export default AddTranslationForm;
