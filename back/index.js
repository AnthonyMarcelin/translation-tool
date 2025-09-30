const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const port = 3001;
const db = require("./db");
app.use(
  cors({
    origin: "http://localhost:3000",
  }),
);
app.use(express.json());

// Traduction automatique via LibreTranslate
app.post("/translate", async (req, res) => {
  const { text, source, target, translation_id } = req.body;
  try {
    const response = await axios.post("http://libretranslate:5000/translate", {
      q: text,
      source,
      target,
      format: "text",
    });
    const translated = response.data.translatedText;

    // Si translation_id est fourni, enregistrer dans la BDD
    if (translation_id) {
      db.run(
        "INSERT INTO translation_values (translation_id, lang, text) VALUES (?, ?, ?)",
        [translation_id, target, translated],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({
            id: this.lastID,
            translation_id,
            lang: target,
            text: translated,
            translatedText: translated,
          });
        },
      );
    } else {
      // Sinon, retourner juste la traduction
      res.json({
        translatedText: translated,
        lang: target,
        text: translated,
      });
    }
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Exporter toutes les langues d'une clé
app.get("/export/key/:id", (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT lang, text FROM translation_values WHERE translation_id = ?
  `;
  db.all(query, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const result = {};
    rows.forEach((row) => {
      result[row.lang] = row.text;
    });
    res.json(result);
  });
});

// Route test
app.get("/", (req, res) => {
  res.send("Backend opérationnel !");
});

// Liste des projets disponibles
app.get("/projects", (req, res) => {
  db.all(
    "SELECT DISTINCT project FROM translations ORDER BY project ASC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const projects = rows.map((row) => row.project);
      res.json(projects);
    },
  );
});

// CRUD translations
app.get("/translations", (req, res) => {
  const { project } = req.query;

  let query = "SELECT * FROM translations";
  let params = [];

  if (project) {
    query += " WHERE project = ?";
    params.push(project);
  }

  query += " ORDER BY created_at DESC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/translations", (req, res) => {
  const { key, project } = req.body;
  if (!key || !project)
    return res.status(400).json({ error: "key et project requis" });
  db.run(
    "INSERT INTO translations (key, project) VALUES (?, ?)",
    [key, project],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, key, project });
    },
  );
});

app.put("/translations/:id", (req, res) => {
  const { id } = req.params;
  const { key, project } = req.body;
  db.run(
    "UPDATE translations SET key = ?, project = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [key, project, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    },
  );
});

app.delete("/translations/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM translations WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// CRUD translation_values
app.get("/translations/:id/values", (req, res) => {
  const { id } = req.params;
  db.all(
    "SELECT * FROM translation_values WHERE translation_id = ?",
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

app.post("/translations/:id/values", (req, res) => {
  const { id } = req.params;
  const { lang, text } = req.body;
  db.run(
    "INSERT INTO translation_values (translation_id, lang, text) VALUES (?, ?, ?)",
    [id, lang, text],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, translation_id: id, lang, text });
    },
  );
});

app.put("/values/:id", (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  db.run(
    "UPDATE translation_values SET text = ? WHERE id = ?",
    [text, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    },
  );
});

app.delete("/values/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM translation_values WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Export JSON par langue pour i18next
app.get("/export/:lang", (req, res) => {
  const { lang } = req.params;
  const { project } = req.query;
  let query = `
    SELECT t.key, v.text
    FROM translations t
    JOIN translation_values v ON v.translation_id = t.id
    WHERE v.lang = ?
  `;
  let params = [lang];
  if (project) {
    query += " AND t.project = ?";
    params.push(project);
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const result = {};
    rows.forEach((row) => {
      result[row.key] = row.text;
    });
    res.json(result);
  });
});

// Export complet d'un projet (toutes langues)
app.get("/export/project/:project", (req, res) => {
  const { project } = req.params;
  const { langs } = req.query;

  // Si des langues spécifiques sont demandées
  const languesToExport = langs ? langs.split(",") : null;

  let query = `
    SELECT t.key, v.lang, v.text
    FROM translations t
    JOIN translation_values v ON v.translation_id = t.id
    WHERE t.project = ?
  `;
  let params = [project];

  if (languesToExport) {
    const placeholders = languesToExport.map(() => "?").join(",");
    query += ` AND v.lang IN (${placeholders})`;
    params.push(...languesToExport);
  }

  query += " ORDER BY t.key, v.lang";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Organiser par langue
    const result = {};
    rows.forEach((row) => {
      if (!result[row.lang]) {
        result[row.lang] = {};
      }
      result[row.lang][row.key] = row.text;
    });

    res.json(result);
  });
});

// Suppression d'un projet et de toutes ses clés/valeurs
app.delete("/projects/:project", (req, res) => {
  const { project } = req.params;
  db.serialize(() => {
    db.all(
      "SELECT id FROM translations WHERE project = ?",
      [project],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const ids = rows.map((r) => r.id);
        if (ids.length === 0) return res.json({ deleted: 0 });
        db.run(
          `DELETE FROM translation_values WHERE translation_id IN (${ids
            .map(() => "?")
            .join(",")})`,
          ids,
          function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            db.run(
              "DELETE FROM translations WHERE project = ?",
              [project],
              function (err3) {
                if (err3) return res.status(500).json({ error: err3.message });
                res.json({ deleted: this.changes });
              },
            );
          },
        );
      },
    );
  });
});

app.listen(port, () => {
  console.log(`Serveur backend lancé sur http://localhost:${port}`);
});
