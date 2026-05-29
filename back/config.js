const isProd = process.env.NODE_ENV === 'production';

// JWT_SECRET must be set explicitly in production. A predictable default would
// let anyone forge tokens and impersonate any user, so refuse to boot without it.
const JWT_SECRET = process.env.JWT_SECRET;
if (isProd && !JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is required in production. ' +
    'Set it to a long random string (e.g. `openssl rand -hex 32`).'
  );
}

module.exports = {
  JWT_SECRET: JWT_SECRET || 'translation-tool-dev-secret-not-for-production',
  LIBRE_URL: process.env.LIBRE_URL || 'http://libretranslate:5000',
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'https://translation.drannoc.duckdns.org'],
  PORT: process.env.PORT || 3001,

  // Public base URL of the frontend, used to build invite links in emails.
  APP_URL: process.env.APP_URL || 'http://localhost:3000',

  // SMTP — optional. When unset, invite emails are logged to the console
  // instead of being sent (handy for local dev and demos).
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'Translation Tool <no-reply@translation.local>',
  },
};
