import { useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useTranslationApi } from "../../../hooks/useTranslationApi";
import "./AddTranslationForm.css";

const AddTranslationForm = () => {
  const { currentProject, selectedLanguages } = useApp();
  const translationApi = useTranslationApi();
  const [newKey, setNewKey] = useState("");
  const [frenchValue, setFrenchValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newKey.trim() || !frenchValue.trim() || !currentProject?.id) return;

    setIsLoading(true);
    setProgress("Création de la traduction...");

    try {
      const translation = await translationApi.createTranslation(
        newKey.trim(),
        currentProject.id
      );

      setProgress("Ajout de la traduction française...");

      await translationApi.addTranslationValue(
        translation.id,
        "fr",
        frenchValue.trim()
      );

      setProgress("Traduction automatique en cours...");

      const otherLanguages = selectedLanguages.filter((lang) => lang !== "fr");

      if (otherLanguages.length > 0) {
        const translationPromises = otherLanguages.map(async (targetLang) => {
          try {
            const result = await translationApi.autoTranslate(
              frenchValue.trim(),
              targetLang,
              "fr",
              translation.id
            );

            if (result?.translatedText) {
              await translationApi.addTranslationValue(
                translation.id,
                targetLang,
                result.translatedText
              );
            }
          } catch (error) {
            console.error(`Échec traduction ${targetLang}:`, error);
          }
        });

        await Promise.allSettled(translationPromises);
      }

      setProgress("Actualisation des données...");

      await translationApi.fetchTranslations(currentProject.id);

      setProgress("Terminé !");

      setTimeout(() => {
        setNewKey("");
        setFrenchValue("");
        setProgress("");
        setIsLoading(false);
      }, 1000);

    } catch (error) {
      console.error("Erreur lors de la création de la traduction:", error);
      alert(`Erreur: ${error.message || "Erreur lors de la création de la traduction"}`);
      setProgress("");
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
                  {progress || "Création..."}
                </>
              ) : (
                <>✨ Créer + Auto-traduire</>
              )}
            </button>
          </div>
        </div>

        {isLoading && progress && (
          <div className="progress-info">
            <div className="progress-bar-container">
              <div className="progress-bar-fill"></div>
            </div>
            <span className="progress-text">{progress}</span>
          </div>
        )}

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
