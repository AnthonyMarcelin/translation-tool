module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'translation-tool-secret-change-in-production',
  LIBRE_URL: process.env.LIBRE_URL || 'http://libretranslate:5000',
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'https://translation.drannoc.duckdns.org'],
  PORT: process.env.PORT || 3001,
};
