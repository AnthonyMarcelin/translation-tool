const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function slugify(text) {
  return (text || 'project')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'project';
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateApiKey() {
  const raw = 'tlt_' + crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw), prefix: raw.slice(0, 12) };
}

function generateRefreshToken() {
  const raw = crypto.randomBytes(40).toString('hex');
  return { raw, hash: hashToken(raw) };
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '15m' });
}

module.exports = { slugify, hashToken, generateApiKey, generateRefreshToken, signAccessToken };
