const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Créer le dossier data s'il n'existe pas
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(__dirname, "data", "translations.db");
const db = new Database(dbPath);

// Wrapper pour compatibilité avec l'API sqlite3
const dbWrapper = {
  run: (sql, params = [], callback) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.run(params);
      // Simule le contexte sqlite3 pour Express
      if (callback) {
        callback.call(
          { changes: result.changes, lastID: result.lastInsertRowid },
          null,
          result,
        );
      }
      return result;
    } catch (err) {
      if (callback) callback(err);
      else throw err;
    }
  },

  get: (sql, params = [], callback) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.get(params);
      if (callback) callback(null, result);
      return result;
    } catch (err) {
      if (callback) callback(err);
      else throw err;
    }
  },

  all: (sql, params = [], callback) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.all(params);
      if (callback) callback(null, result);
      return result;
    } catch (err) {
      if (callback) callback(err);
      else throw err;
    }
  },

  serialize: (callback) => {
    // better-sqlite3 est déjà synchrone, on exécute directement
    callback();
  },
};

// Création des tables si elles n'existent pas
const initDb = () => {
  dbWrapper.run(`CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    project TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  dbWrapper.run(`CREATE TABLE IF NOT EXISTS translation_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    translation_id INTEGER NOT NULL,
    lang TEXT NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY (translation_id) REFERENCES translations(id) ON DELETE CASCADE
  )`);

  // Insérer les données de démonstration si la table est vide
  const count = dbWrapper.get("SELECT COUNT(*) as count FROM translations");
  if (count.count === 0) {
    insertDemoData();
  }
};

const insertDemoData = () => {
  console.log("Insertion des données de démonstration...");

  const demoProjects = [
    {
      name: "Demo Project",
      translations: [
        {
          key: "welcome",
          values: {
            fr: "Bienvenue sur notre plateforme",
            en: "Welcome to our platform",
            es: "Bienvenido a nuestra plataforma",
            de: "Willkommen auf unserer Plattform",
            it: "Benvenuti sulla nostra piattaforma",
            nl: "Welkom op ons platform",
            pt: "Bem-vindo à nossa plataforma",
            ja: "私たちのプラットフォームへようこそ",
          },
        },
        {
          key: "goodbye",
          values: {
            fr: "Au revoir et à bientôt !",
            en: "Goodbye and see you soon!",
            es: "¡Adiós y hasta pronto!",
            de: "Auf Wiedersehen und bis bald!",
            it: "Arrivederci e a presto!",
            nl: "Tot ziens en tot snel!",
            pt: "Adeus e até breve!",
            ja: "さようなら、また会いましょう！",
          },
        },
        {
          key: "login",
          values: {
            fr: "Se connecter",
            en: "Log in",
            es: "Iniciar sesión",
            de: "Anmelden",
            it: "Accedi",
            nl: "Inloggen",
            pt: "Entrar",
            ja: "ログイン",
          },
        },
        {
          key: "logout",
          values: {
            fr: "Se déconnecter",
            en: "Log out",
            es: "Cerrar sesión",
            de: "Abmelden",
            it: "Disconnetti",
            nl: "Uitloggen",
            pt: "Sair",
            ja: "ログアウト",
          },
        },
        {
          key: "settings",
          values: {
            fr: "Paramètres",
            en: "Settings",
            es: "Configuración",
            de: "Einstellungen",
            it: "Impostazioni",
            nl: "Instellingen",
            pt: "Configurações",
            ja: "設定",
          },
        },
        {
          key: "profile",
          values: {
            fr: "Profil utilisateur",
            en: "User profile",
            es: "Perfil de usuario",
            de: "Benutzerprofil",
            it: "Profilo utente",
            nl: "Gebruikersprofiel",
            pt: "Perfil do usuário",
            ja: "ユーザープロフィール",
          },
        },
        {
          key: "search",
          values: {
            fr: "Rechercher",
            en: "Search",
            es: "Buscar",
            de: "Suchen",
            it: "Cerca",
            nl: "Zoeken",
            pt: "Pesquisar",
            ja: "検索",
          },
        },
        {
          key: "help",
          values: {
            fr: "Aide et support",
            en: "Help and support",
            es: "Ayuda y soporte",
            de: "Hilfe und Support",
            it: "Aiuto e supporto",
            nl: "Hulp en ondersteuning",
            pt: "Ajuda e suporte",
            ja: "ヘルプとサポート",
          },
        },
      ],
    },
    {
      name: "E-commerce Site",
      translations: [
        {
          key: "add_to_cart",
          values: {
            fr: "Ajouter au panier",
            en: "Add to cart",
            es: "Añadir al carrito",
            de: "In den Warenkorb",
            it: "Aggiungi al carrello",
            nl: "Toevoegen aan winkelwagen",
            pt: "Adicionar ao carrinho",
            ja: "カートに追加",
          },
        },
        {
          key: "checkout",
          values: {
            fr: "Procéder au paiement",
            en: "Proceed to checkout",
            es: "Proceder al pago",
            de: "Zur Kasse gehen",
            it: "Procedi al pagamento",
            nl: "Afrekenen",
            pt: "Finalizar compra",
            ja: "決済に進む",
          },
        },
        {
          key: "shipping",
          values: {
            fr: "Livraison gratuite",
            en: "Free shipping",
            es: "Envío gratis",
            de: "Kostenloser Versand",
            it: "Spedizione gratuita",
            nl: "Gratis verzending",
            pt: "Frete grátis",
            ja: "送料無料",
          },
        },
      ],
    },
  ];

  demoProjects.forEach((project) => {
    project.translations.forEach((translation) => {
      // Insérer la traduction
      const result = dbWrapper.run(
        "INSERT INTO translations (key, project) VALUES (?, ?)",
        [translation.key, project.name],
      );

      const translationId = result.lastInsertRowid;

      // Insérer toutes les valeurs pour cette traduction
      Object.entries(translation.values).forEach(([lang, text]) => {
        dbWrapper.run(
          "INSERT INTO translation_values (translation_id, lang, text) VALUES (?, ?, ?)",
          [translationId, lang, text],
        );
      });
    });
  });

  console.log("Données de démonstration insérées avec succès !");
};

// Initialiser la base de données
initDb();

module.exports = dbWrapper;
