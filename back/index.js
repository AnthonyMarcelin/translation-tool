const express = require('express');
const cors = require('cors');
const { PORT, allowedOrigins } = require('./config');

const app = express();
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

// Public routes (no global auth guard — each does its own auth)
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/invites'));
app.use('/', require('./routes/publicApi'));

// Global auth guard for all routes below
const { requireAuth } = require('./middleware/auth');
app.use(requireAuth);

// Protected routes
app.use('/', require('./routes/orgs'));
app.use('/', require('./routes/projects'));
app.use('/', require('./routes/translations'));
app.use('/', require('./routes/export'));
app.use('/', require('./routes/translate'));

// Only start listening when run directly (`node index.js`), not when imported
// by the test suite, which drives the app on an ephemeral port.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Server] Translation Tool v2 running on port ${PORT}`);
  });
}

module.exports = app;
