import { useState } from "react";
import { useApp } from "../context/AppContext";
import "./AddTranslationForm.css";

const API = "/api";

const AddTranslationForm = () => {
  const { currentProject, selectedLanguages, dispatch, actions } = useApp();
  const [newKey, setNewKey] = useState("");
  const [frenchValue, setFrenchValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newKey.trim() || !frenchValue.trim() || !currentProject) return;

    setIsLoading(true);
    try {
      // 1. Créer la clé
      const keyResponse = await fetch(`${API}/translations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim(), project: currentProject }),
      });
      const keyData = await keyResponse.json();
      const translationId = keyData.id;

      // 2. Ajouter la valeur française
      await fetch(
        `${API}/translations/${translationId}/values`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang: "fr", text: frenchValue.trim() }),
        },
      );

      // 3. Traduction automatique pour les autres langues
      const otherLanguages = selectedLanguages.filter((lang) => lang !== "fr");
      const values = { fr: frenchValue.trim() };

      for (const targetLang of otherLanguages) {
        try {
          const translateResponse = await fetch(
            `${API}/translate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: frenchValue.trim(),
                source: "fr",
                target: targetLang,
                translation_id: translationId,
              }),
            },
          );
          const translateResult = await translateResponse.json();
          values[targetLang] = translateResult.translatedText || "";
        } catch (error) {
          console.error(`Translation error for ${targetLang}:`, error);
          values[targetLang] = "";
        }
      }

      // 4. Ajouter à l'état local
      const newTranslation = {
        id: translationId,
        key: newKey.trim(),
        project: currentProject,
        values,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      dispatch({ type: actions.ADD_TRANSLATION, payload: newTranslation });

      // Reset form
      setNewKey("");
      setFrenchValue("");
    } catch (error) {
      console.error("Error creating translation:", error);
      alert("Erreur lors de la création de la traduction");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentProject) return null;

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
            <label htmlFor="french-input">🇫🇷 Texte en français</label>
            <input
              id="french-input"
              type="text"
              placeholder="Bienvenue sur notre site"
              value={frenchValue}
              onChange={(e) => setFrenchValue(e.target.value)}
              className="form-input"
              disabled={isLoading}
            />
          </div>

          <div className="submit-group">
            <button
              type="submit"
              disabled={!newKey.trim() || !frenchValue.trim() || isLoading}
              className={`submit-btn ${isLoading ? "loading" : ""}`}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Création...
                </>
              ) : (
                <>✨ Créer + Auto-traduire</>
              )}
            </button>
          </div>
        </div>

        <div className="auto-translate-info">
          <span className="info-icon">ℹ️</span>
          <span>
            La traduction française sera automatiquement traduite vers :{" "}
            {selectedLanguages
              .filter((lang) => lang !== "fr")
              .join(", ")
              .toUpperCase() || "aucune langue sélectionnée"}
          </span>
        </div>
      </form>
    </div>
  );
};

export default AddTranslationForm;
