const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "data", "translations.db");
const db = new Database(dbPath);

// Création des tables si elles n'existent pas
const initDb = () => {
  db.serialize(() => {
    db.run("DROP TABLE IF EXISTS translation_values");
    db.run("DROP TABLE IF EXISTS translations");
    db.run(`CREATE TABLE IF NOT EXISTS translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      project TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS translation_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      translation_id INTEGER NOT NULL,
      lang TEXT NOT NULL,
      text TEXT,
      FOREIGN KEY (translation_id) REFERENCES translations(id)
    )`);

    // Insérer des données de démonstration
    insertDemoData();
  });
};

const insertDemoData = () => {
  console.log("🌟 Insertion des données de démonstration...");

  // Projet de démonstration avec différents types de clés
  const demoTranslations = [
    {
      key: "welcome_message",
      project: "Demo Project",
      values: {
        fr: "Bienvenue dans notre application !",
        en: "Welcome to our application!",
        es: "¡Bienvenido a nuestra aplicación!",
        de: "Willkommen in unserer Anwendung!",
        it: "Benvenuto nella nostra applicazione!",
        nl: "Welkom in onze applicatie!",
        pt: "Bem-vindo ao nosso aplicativo!",
        ja: "私たちのアプリケーションへようこそ！",
      },
    },
    {
      key: "navigation.home",
      project: "Demo Project",
      values: {
        fr: "Accueil",
        en: "Home",
        es: "Inicio",
        de: "Startseite",
        it: "Casa",
        nl: "Thuis",
        pt: "Início",
        ja: "ホーム",
      },
    },
    {
      key: "navigation.about",
      project: "Demo Project",
      values: {
        fr: "À propos",
        en: "About",
        es: "Acerca de",
        de: "Über uns",
        it: "Chi siamo",
        nl: "Over ons",
        pt: "Sobre",
        ja: "について",
      },
    },
    {
      key: "button.save",
      project: "Demo Project",
      values: {
        fr: "Enregistrer",
        en: "Save",
        es: "Guardar",
        de: "Speichern",
        it: "Salva",
        nl: "Opslaan",
        pt: "Salvar",
        ja: "保存",
      },
    },
    {
      key: "button.cancel",
      project: "Demo Project",
      values: {
        fr: "Annuler",
        en: "Cancel",
        es: "Cancelar",
        de: "Abbrechen",
        it: "Annulla",
        nl: "Annuleren",
        pt: "Cancelar",
        ja: "キャンセル",
      },
    },
    {
      key: "form.email",
      project: "Demo Project",
      values: {
        fr: "Adresse e-mail",
        en: "Email address",
        es: "Dirección de correo",
        de: "E-Mail-Adresse",
        it: "Indirizzo email",
        nl: "E-mailadres",
        pt: "Endereço de email",
        ja: "メールアドレス",
      },
    },
    {
      key: "error.required_field",
      project: "Demo Project",
      values: {
        fr: "Ce champ est obligatoire",
        en: "This field is required",
        es: "Este campo es obligatorio",
        de: "Dieses Feld ist erforderlich",
        it: "Questo campo è obbligatorio",
        nl: "Dit veld is verplicht",
        pt: "Este campo é obrigatório",
        ja: "この項目は必須です",
      },
    },
    {
      key: "success.saved",
      project: "Demo Project",
      values: {
        fr: "Sauvegardé avec succès !",
        en: "Successfully saved!",
        es: "¡Guardado exitosamente!",
        de: "Erfolgreich gespeichert!",
        it: "Salvato con successo!",
        nl: "Succesvol opgeslagen!",
        pt: "Salvo com sucesso!",
        ja: "正常に保存されました！",
      },
    },
  ];

  // Insérer chaque traduction
  demoTranslations.forEach((translation, index) => {
    const translationId = index + 1;

    db.run(
      "INSERT OR IGNORE INTO translations (id, key, project) VALUES (?, ?, ?)",
      [translationId, translation.key, translation.project],
      function (err) {
        if (err) {
          console.error(
            `Erreur insertion translation ${translation.key}:`,
            err,
          );
          return;
        }

        // Insérer les valeurs pour chaque langue
        Object.entries(translation.values).forEach(([lang, text]) => {
          db.run(
            "INSERT OR IGNORE INTO translation_values (translation_id, lang, text) VALUES (?, ?, ?)",
            [translationId, lang, text],
            function (err) {
              if (err) {
                console.error(
                  `Erreur insertion value ${translation.key}[${lang}]:`,
                  err,
                );
              }
            },
          );
        });
      },
    );
  });

  // Ajouter un deuxième projet pour montrer l'isolation
  const secondProjectTranslations = [
    {
      key: "login.title",
      project: "E-commerce Site",
      values: {
        fr: "Connexion",
        en: "Login",
        es: "Iniciar sesión",
        nl: "Inloggen",
        ja: "ログイン",
      },
    },
    {
      key: "product.add_to_cart",
      project: "E-commerce Site",
      values: {
        fr: "Ajouter au panier",
        en: "Add to cart",
        es: "Añadir al carrito",
        nl: "Toevoegen aan winkelwagen",
        ja: "カートに追加",
      },
    },
    {
      key: "checkout.total",
      project: "E-commerce Site",
      values: {
        fr: "Total",
        en: "Total",
        es: "Total",
        nl: "Totaal",
        ja: "合計",
      },
    },
  ];

  // Insérer le deuxième projet (IDs 9-11)
  secondProjectTranslations.forEach((translation, index) => {
    const translationId = index + 9; // Commencer après le premier projet

    db.run(
      "INSERT OR IGNORE INTO translations (id, key, project) VALUES (?, ?, ?)",
      [translationId, translation.key, translation.project],
      function (err) {
        if (err) {
          console.error(
            `Erreur insertion translation ${translation.key}:`,
            err,
          );
          return;
        }

        Object.entries(translation.values).forEach(([lang, text]) => {
          db.run(
            "INSERT OR IGNORE INTO translation_values (translation_id, lang, text) VALUES (?, ?, ?)",
            [translationId, lang, text],
            function (err) {
              if (err) {
                console.error(
                  `Erreur insertion value ${translation.key}[${lang}]:`,
                  err,
                );
              }
            },
          );
        });
      },
    );
  });

  console.log("✅ Données de démonstration insérées !");
};

initDb();

module.exports = db;
