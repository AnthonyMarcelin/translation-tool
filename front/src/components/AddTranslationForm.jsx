import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApiOptimized";
import "./AddTranslationForm.css";

const AddTranslationForm = () => {
  const { currentProject, selectedLanguages } = useApp();
  const api = useApi();
  const [newKey, setNewKey] = useState("");
  const [frenchValue, setFrenchValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newKey.trim() || !frenchValue.trim() || !currentProject) return;

    setIsLoading(true);
    try {
      await api.createTranslation(
        newKey.trim(),
        frenchValue.trim(),
        currentProject,
        selectedLanguages,
      );
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
