import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useFilters } from "../hooks/useFilters";
import { LANGUAGES } from "../constants";
import { apiJson, apiFetch, API_BASE } from "../lib/api";
import "./TranslationsTable.css";

const STATUS_COLORS = { draft: "#64748b", reviewed: "#f59e0b", approved: "#10b981" };
const STATUS_LABELS = { draft: "Brouillon", reviewed: "Relu", approved: "Approuvé" };

const TranslationsTable = () => {
  const { currentProject, selectedLanguages, projectLanguages, dispatch, actions } = useApp();
  const { filteredTranslations } = useFilters();
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const paginated = filteredTranslations.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredTranslations.length / pageSize);

  const startEdit = (translationId, lang) => {
    const t = filteredTranslations.find(t => t.id === translationId);
    setEditingCell(`${translationId}-${lang}`);
    setEditValue(t?.values?.[lang] || "");
  };

  const saveEdit = async (translationId, lang) => {
    const t = filteredTranslations.find(t => t.id === translationId);
    const valueId = t?.value_ids?.[lang];
    const text = editValue;

    setEditingCell(null);
    setEditValue("");

    try {
      if (valueId) {
        await apiJson(`/values/${valueId}`, {
          method: "PUT",
          body: JSON.stringify({ text }),
        });
        dispatch({ type: actions.UPDATE_TRANSLATION_VALUE, payload: { translationId, lang, value: text } });
      } else {
        const created = await apiJson(`/translations/${translationId}/values`, {
          method: "POST",
          body: JSON.stringify({ lang, text }),
        });
        dispatch({ type: actions.UPDATE_TRANSLATION_VALUE, payload: { translationId, lang, value: text, valueId: created?.id } });
      }
    } catch (err) {
      console.error("Save error:", err);
      return;
    }

    // If we just edited the source language, silently auto-translate to all other
    // languages that are currently empty or still in draft status.
    const sourceLangCode = projectLanguages.find(l => l.is_source)?.lang_code;
    if (!sourceLangCode || lang !== sourceLangCode || !text.trim()) return;

    const targets = selectedLanguages.filter(l => {
      if (l === sourceLangCode) return false;
      const val = t?.values?.[l] || "";
      const status = t?.statuses?.[l] || "draft";
      return !val.trim() || status === "draft";
    });

    for (const target of targets) {
      try {
        const result = await apiJson("/translate", {
          method: "POST",
          body: JSON.stringify({ text, source: sourceLangCode, target, translation_id: translationId }),
        });
        if (result.translatedText) {
          dispatch({ type: actions.UPDATE_TRANSLATION_VALUE, payload: { translationId, lang: target, value: result.translatedText } });
        }
      } catch {
        // silent — translation service may be unavailable
      }
    }
  };

  const cancelEdit = () => { setEditingCell(null); setEditValue(""); };

  const handleKeyDown = (e, translationId, lang) => {
    if (e.key === "Enter") { e.preventDefault(); saveEdit(translationId, lang); }
    else if (e.key === "Escape") cancelEdit();
  };

  const handleAutoTranslate = async (translationId, fromLang, toLang) => {
    const t = filteredTranslations.find(t => t.id === translationId);
    const sourceText = t?.values?.[fromLang];
    if (!sourceText) { alert(`Aucun texte source en ${fromLang.toUpperCase()}`); return; }

    try {
      const result = await apiJson("/translate", {
        method: "POST",
        body: JSON.stringify({ text: sourceText, source: fromLang, target: toLang, translation_id: translationId }),
      });
      if (result.translatedText) {
        dispatch({ type: actions.UPDATE_TRANSLATION_VALUE, payload: { translationId, lang: toLang, value: result.translatedText } });
      }
    } catch (err) {
      alert(`Erreur de traduction : ${err.message}`);
    }
  };

  const handleDelete = async (translationId) => {
    if (!window.confirm("Supprimer cette traduction ?")) return;
    try {
      await apiJson(`/translations/${translationId}`, { method: "DELETE" });
      dispatch({ type: actions.REMOVE_TRANSLATION, payload: translationId });
      setSelected(s => { const n = new Set(s); n.delete(translationId); return n; });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!currentProject || selected.size === 0) return;
    if (!window.confirm(`Supprimer ${selected.size} traduction(s) ?`)) return;
    try {
      await apiJson(`/projects/${currentProject.id}/translations/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ ids: [...selected] }),
      });
      selected.forEach(id => dispatch({ type: actions.REMOVE_TRANSLATION, payload: id }));
      setSelected(new Set());
    } catch (err) {
      alert(err.message);
    }
  };

  const exportZip = async () => {
    if (!currentProject) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/projects/${currentProject.id}/export/zip`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentProject.name}-translations.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleSelect = (id) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map(t => t.id)));
  };

  const getLangInfo = (code) => LANGUAGES.find(l => l.code === code);

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
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h3>📊 Traductions ({filteredTranslations.length})</h3>
          {selected.size > 0 && (
            <button className="bulk-delete-btn" onClick={handleBulkDelete}>
              🗑️ Supprimer {selected.size} sélection(s)
            </button>
          )}
        </div>
        <div className="table-actions">
          <button className="export-btn" onClick={exportZip}>📥 Export ZIP</button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="translations-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll} />
              </th>
              <th className="actions-column"></th>
              <th className="key-column">Clé</th>
              {selectedLanguages.map(code => {
                const lang = getLangInfo(code);
                return (
                  <th key={code} className="lang-column">
                    <div className="lang-header">
                      <span className="lang-flag">{lang?.flag}</span>
                      <span className="lang-name">{lang?.name}</span>
                      <span className="lang-code">{code.toUpperCase()}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginated.map(translation => (
              <tr key={translation.id} className={`translation-row ${selected.has(translation.id) ? "selected" : ""}`}>
                <td className="checkbox-cell">
                  <input type="checkbox" checked={selected.has(translation.id)} onChange={() => toggleSelect(translation.id)} />
                </td>
                <td className="actions-cell">
                  <button className="delete-btn" onClick={() => handleDelete(translation.id)} title="Supprimer">🗑️</button>
                </td>
                <td className="key-cell">
                  <div className="key-content">
                    <span className="key-text">{translation.key}</span>
                    {translation.description && <small className="key-desc">{translation.description}</small>}
                  </div>
                </td>

                {selectedLanguages.map(langCode => {
                  const cellKey = `${translation.id}-${langCode}`;
                  const isEditing = editingCell === cellKey;
                  const value = translation.values?.[langCode] || "";
                  const status = translation.statuses?.[langCode] || "draft";
                  const isEmpty = !value.trim();

                  return (
                    <td key={langCode} className={`translation-cell ${isEmpty ? "empty" : ""}`}>
                      {isEditing ? (
                        <div className="edit-mode">
                          <textarea
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => handleKeyDown(e, translation.id, langCode)}
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
                              <span className="empty-text">Cliquer pour saisir</span>
                              <div className="auto-translate-options">
                                {selectedLanguages
                                  .filter(l => l !== langCode && translation.values?.[l])
                                  .slice(0, 2)
                                  .map(srcLang => (
                                    <button
                                      key={srcLang}
                                      className="auto-translate-btn"
                                      onClick={e => { e.stopPropagation(); handleAutoTranslate(translation.id, srcLang, langCode); }}
                                      title={`Traduire depuis ${srcLang.toUpperCase()}`}
                                    >
                                      {getLangInfo(srcLang)?.flag} → {getLangInfo(langCode)?.flag}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          ) : (
                            <div className="value-display">
                              <span className="value-text">{value}</span>
                              <div className="cell-meta">
                                <span
                                  className="status-dot"
                                  style={{ background: STATUS_COLORS[status] }}
                                  title={STATUS_LABELS[status]}
                                />
                                <button className="edit-btn" title="Éditer">✏️</button>
                              </div>
                            </div>
                          )}
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

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
          <span>Page {page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
        </div>
      )}
    </div>
  );
};

export default TranslationsTable;
