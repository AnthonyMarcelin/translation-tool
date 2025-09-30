# Outil de Gestion des Traductions

## 🛠 Objectif

Outil interne pour gérer les traductions de projets i18next :

- Saisie de clés + traduction française.
- Traduction automatique vers plusieurs langues via **LibreTranslate** self-hosted.
- Édition manuelle si besoin.
- Export JSON par langue (`locales/en.json`, `locales/es.json`, etc.).
- Stockage persistant dans une **BDD légère** (SQLite) pour suivre les modifications.
- Accessible depuis l’extérieur pour l’équipe.
- Possibilité d’ajouter facilement de nouvelles langues sans changer le code.

---

## 📦 Architecture

- **Frontend React** : formulaire dynamique pour saisir clé + FR, champs pour autres langues, bouton “Auto-trad”, export JSON.
- **Backend Node.js/Express** : API REST pour CRUD des traductions, génération automatique via LibreTranslate, export JSON.
- **LibreTranslate Docker** : conteneur self-hosted pour traductions automatiques.
- **BDD SQLite** : stockage persistant, flexible pour ajouter de nouvelles langues.

---

## 🗄 Base de données (SQLite)

- Structure flexible pour ajouter des langues :
  - **translations** : id, key, created_at, updated_at
  - **translation_values** : id, translation_id, lang (ex: "fr", "en"), text
- Avantages :
  - Ajouter une langue = ajouter des lignes dans `translation_values`.
  - Backend et frontend dynamiques → pas besoin de modifier le code.
  - Export JSON automatique pour toutes les langues existantes.

---

## 🐳 Dockerisation

- LibreTranslate : conteneur officiel avec volume persistant pour les données.
- Translator App (frontend + backend) : conteneur Node.js/React, volume pour persistance.
- Traefik : reverse proxy pour exposer l’outil sur ton serveur en HTTPS.
- Volumes persistants pour config et données.

Exemple `docker-compose.yml` simplifié :

```yaml
version: "3.8"
services:
  libretranslate:
    image: libretranslate/libretranslate:latest
    ports:
      - "5000:5000"
    volumes:
      - ./libretranslate_data:/data

  translator_app:
    build: ./translator_app
    ports:
      - "3000:3000"
    depends_on:
      - libretranslate
    volumes:
      - ./translator_data:/app/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.translator.rule=Host(`trad.mondomaine.com`)"
      - "traefik.http.routers.translator.entrypoints=websecure"
      - "traefik.http.routers.translator.tls=true"
```

⚡ Fonctionnalités clés
Création / édition de clés.
Traduction FR → plusieurs langues (en, es, de, it, nl, etc.).
Ajout facile de nouvelles langues à tout moment.
Correction manuelle des traductions.
Export JSON automatique pour i18next.
Stockage persistant SQLite.
Accessibilité externe via Traefik / HTTPS.
100% Dockerisé → déploiement et maintenance simples.
🕒 Estimation du temps de développement
Backend REST API CRUD : 30–60 min
Frontend React dynamique : 1–2 h
Connexion LibreTranslate : 30 min
Export JSON locales : 30 min
Dockerisation complète : 30 min
Total : ~3–4 h avec Copilot + GPT‑4.1
💡 Astuces pour aller vite
Commencer par BDD et backend CRUD flexible.
Tester LibreTranslate avec Postman ou curl avant intégration.
Frontend minimaliste avec Tailwind CSS pour accélérer.
JSON locales : générer dynamiquement pour toutes les langues existantes.
Backend et frontend dynamiques → aucune limite à l’ajout de langues.
