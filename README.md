# Translation ## Installation

### Prérequis

- Docker et Docker Compose

### Développement local (branche `main`)

```sh
git clone https://github.com/AnthonyMarcelin/translation-tool.git
cd translation-tool
git checkout main
docker compose up -d --build
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

### Déploiement en production (branche `server`)

Pour un déploiement avec Traefik et nom de domaine :

```sh
git clone https://github.com/AnthonyMarcelin/translation-tool.git
cd translation-tool
git checkout server
docker compose up -d --build
```

**Prérequis pour la production :**
- Traefik configuré avec le réseau `traefik_public`
- Certificats SSL Let's Encrypt
- Nom de domaine configuré (ex: `translation.votre-domaine.com`)

La branche `server` contient les configurations spécifiques :
- Routes API via `/api` au lieu de `localhost:3001`
- Labels Traefik pour reverse proxy
- Certificats SSL automatiques
- CORS configuré pour le domaine de productiongestion et d’automatisation des traductions pour projets web.

## Fonctionnalités

- Dashboard moderne pour gérer les clés et traductions
- Multi-projets, multi-langues
- Traduction automatique via LibreTranslate (API locale)
- Export JSON par langue ou ZIP complet
- Ajout, édition, suppression de clés et projets
- Sélection dynamique des langues supportées
- Persistance des données (SQLite + Docker volumes)

## Installation

### Prérequis

- Docker et Docker Compose

### Démarrage rapide

```sh
git clone https://github.com/AnthonyMarcelin/translation-tool.git
cd translation-tool
docker compose up -d --build
```

L’application sera disponible sur [http://localhost:3000](http://localhost:3000)

## Utilisation

- Créez vos projets et clés dans l’interface
- Ajoutez/éditez les traductions manuellement ou via auto-traduction
- Exportez vos fichiers pour i18next ou autres outils

## Structure du projet

### Branches

- **`main`** : Développement local avec accès direct aux ports (localhost:3000, localhost:3001)
- **`server`** : Production avec Traefik, certificats SSL et nom de domaine

### Workflow recommandé

1. Développement sur la branche `main`
2. Merge des nouvelles fonctionnalités vers `server` pour déploiement
3. Adaptations spécifiques production uniquement sur `server`

## Technologies

- Frontend : React + Vite
- Backend : Express.js + SQLite
- Traduction : LibreTranslate (API locale Docker)
- Production : Traefik reverse proxy

## Licence

### Translation Tool

Ce projet est sous licence MIT. Vous pouvez l’utiliser, le modifier et le distribuer librement.

### LibreTranslate

La brique de traduction automatique utilise [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate), qui est sous licence **AGPL v3**.

> **Attention :** L’AGPL impose que toute utilisation modifiée ou intégrée dans un service web doit rendre le code source disponible aux utilisateurs. Si vous déployez ce projet en production, vérifiez la compatibilité de vos usages avec l’AGPL.

## Remerciements

- [LibreTranslate](https://libretranslate.com/) pour l’API de traduction open source

## Liens utiles

- [Documentation LibreTranslate](https://github.com/LibreTranslate/LibreTranslate)
- [Licence AGPL v3](https://www.gnu.org/licenses/agpl-3.0.html)
- [Licence MIT](https://opensource.org/licenses/MIT)

---

Pour toute question ou contribution, ouvrez une issue ou contactez Anthony Marcelin sur GitHub !
