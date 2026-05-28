# Tolgee-lite — Self-hosted Translation Management

A free, self-hosted alternative to Tolgee. Manage translation keys across multiple organisations and projects, invite team members, auto-translate via LibreTranslate, and deliver translations to your apps through a simple REST API.

Built with React + Vite, Express, and SQLite. Ships as three Docker containers — no external database required.

---

## Features

- **Multi-tenant** — organisations → projects → members with role-based access
- **JWT authentication** — access tokens (15 min) + refresh tokens (7 days)
- **Project invitations** — invite collaborators by e-mail with a shareable token link
- **API keys** — generate `tlt_` keys per project so your apps can fetch translations at runtime without a user session
- **Auto-translation** — powered by a local LibreTranslate instance (no third-party API calls)
- **Translation status** — `draft` / `reviewed` / `approved` workflow per value
- **Bulk operations** — bulk delete, bulk status change
- **Import** — JSON, YAML, CSV with `merge`, `replace`, or `skip` strategies
- **Export** — flat JSON, nested JSON, YAML, CSV, or a ZIP of all languages
- **Configurable languages per project** — add/remove languages and set the source language from project settings
- **Two views** — table view and card view
- **Dark UI** — unified dark theme throughout

### Supported languages (auto-translation)

French · English · Spanish · German · Italian · Dutch · Portuguese · Japanese

---

## Quick start

```sh
git clone https://github.com/AnthonyMarcelin/translation-tool.git
cd translation-tool
docker compose up -d --build
```

| Service | URL |
|---|---|
| Web UI | http://localhost:3000 |
| API | http://localhost:3001 |
| LibreTranslate | http://localhost:5001 |

Default admin account: **admin@local.dev** / **admin123**

> LibreTranslate downloads language models on first boot — auto-translation will be unavailable for a few minutes until the models are ready.

---

## Using translations in your app

The primary use-case: generate an API key inside the tool, then fetch your translations at build time or at runtime — making your frontend independent from this server.

### 1. Create an API key

Open your project → **Settings** → **API Keys** → **New key**.

The full key (`tlt_…`) is shown only once. Copy it.

### 2. Fetch translations

```bash
# Flat JSON for a single language (i18next-compatible)
curl -H "X-API-Key: tlt_YOUR_KEY" \
  http://localhost:3001/v1/export/fr?format=flat_json

# All languages as { "fr": { "key": "value" }, "en": { ... } }
curl -H "X-API-Key: tlt_YOUR_KEY" \
  http://localhost:3001/v1/export/all

# ZIP archive with one file per language
curl -H "X-API-Key: tlt_YOUR_KEY" \
  http://localhost:3001/v1/export/zip -o translations.zip
```

### 3. React / i18next example

```js
// scripts/fetch-translations.mjs
const res = await fetch('http://your-server:3001/v1/export/all', {
  headers: { 'X-API-Key': process.env.TRANSLATION_API_KEY },
});
const translations = await res.json();
// write each language to public/locales/<lang>/translation.json
```

Run this at build time (e.g. in CI) and commit the output — your app is then fully independent from this server at runtime.

---

## API reference

All routes require `Authorization: Bearer <access_token>` or `X-API-Key: tlt_<key>` unless marked as public.

### Auth (public)

| Method | Path | Body |
|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` |
| POST | `/auth/login` | `{ email, password }` → `{ access_token, refresh_token, user }` |
| POST | `/auth/refresh` | `{ refresh_token }` → `{ access_token }` |
| POST | `/auth/logout` | — |
| GET | `/auth/me` | — |

### Organisations

```
GET    /orgs
POST   /orgs                          { name }
GET    /orgs/:slug
PUT    /orgs/:slug                    { name }
DELETE /orgs/:slug

GET    /orgs/:slug/members
POST   /orgs/:slug/members            { email, role }
PUT    /orgs/:slug/members/:userId    { role }
DELETE /orgs/:slug/members/:userId
```

### Projects

```
GET    /orgs/:slug/projects
POST   /orgs/:slug/projects           { name, description? }
GET    /projects/:id
PUT    /projects/:id                  { name, description? }
DELETE /projects/:id

GET    /projects/:id/members
POST   /projects/:id/members          { email, role }
DELETE /projects/:id/members/:userId
```

### Invitations (public endpoints)

```
POST   /projects/:id/invites          { email, role }  → { token }
GET    /invites/:token
POST   /invites/:token/accept         { name?, password? }
```

### Languages

```
GET    /projects/:id/languages
POST   /projects/:id/languages        { lang_code, is_source? }
DELETE /projects/:id/languages/:langCode
```

### API keys

```
GET    /projects/:id/api-keys
POST   /projects/:id/api-keys         { name, permissions, expires_at? }  → { key: "tlt_…" }
DELETE /api-keys/:id
```

### Translations

```
GET    /projects/:id/translations     ?search=&page=&limit=&lang=&status=&sort=&order=
POST   /projects/:id/translations     { key, description? }
PUT    /translations/:id              { key?, description? }
DELETE /translations/:id

GET    /translations/:id/values
POST   /translations/:id/values       { lang, text }
PUT    /values/:id                    { text?, status? }
DELETE /values/:id
```

### Bulk operations

```
POST   /projects/:id/translations/bulk-delete   { ids: [1, 2, 3] }
POST   /projects/:id/translations/bulk-status   { ids, lang, status }
```

### Export / Import

```
GET    /v1/export/:lang               ?format=flat_json|nested_json|yaml|csv
GET    /v1/export/all
GET    /v1/export/zip
POST   /v1/import                     multipart/form-data: file + strategy (merge|replace|skip)
```

---

## Roles

| Role | Scope | Permissions |
|---|---|---|
| `owner` | org / project | full access, can delete |
| `admin` | org | manage members and projects |
| `manager` | project | manage members, approve translations |
| `developer` | project | create/edit keys and values |
| `translator` | project | edit values only |

---

## Environment variables

### Backend (`back/`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port |
| `JWT_SECRET` | *(random at start)* | Signing secret for access tokens — **set this in production** |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS allowed origins, comma-separated |
| `LIBRETRANSLATE_URL` | `http://libretranslate:5000` | Auto-translate endpoint |

### Frontend (`front/`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | Backend base URL, baked in at build time |

Set `VITE_API_URL` as a build arg in `docker-compose.yml` when deploying to a domain:

```yaml
services:
  front:
    build:
      context: ./front
      args:
        VITE_API_URL: https://api.your-domain.com
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, react-router-dom 7 |
| Backend | Node.js, Express 5, better-sqlite3 |
| Auth | jsonwebtoken, bcrypt |
| Database | SQLite (persisted via Docker volume) |
| Auto-translation | LibreTranslate (local Docker container) |
| Static server | nginx (serves the React SPA) |

---

## Development

```sh
# Backend (port 3001, with nodemon)
cd back && npm install && npm run dev

# Frontend (port 5173, with HMR)
cd front && npm install && npm run dev
```

Set `VITE_API_URL=http://localhost:3001` in `front/.env.local` if needed.

---

## Upgrading from v1

The migration runs automatically on first boot. It:

1. Creates a default organisation ("Default") and an admin account (`admin@local.dev` / `admin123`)
2. Migrates all existing projects and translations to the new schema
3. Leaves the original SQLite data untouched as a fallback

No manual steps required.

---

## Licence

### Translation Tool

MIT — use it, modify it, deploy it freely.

### LibreTranslate

Auto-translation uses [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate), licensed under **AGPL v3**.

If you run this as a hosted service and modify LibreTranslate, the AGPL requires you to make those modifications available. See [the full licence text](https://www.gnu.org/licenses/agpl-3.0.html) for details.

---

Made by [Anthony Marcelin](https://github.com/AnthonyMarcelin) — issues and PRs welcome.
