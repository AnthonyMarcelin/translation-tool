const express = require('express');
const corsMiddleware = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');
const translationRoutes = require('./routes/translation.routes');
const projectRoutes = require('./routes/project.routes');

const app = express();
const port = 3001;

app.use(corsMiddleware);
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Translation Tool API is running');
});

app.use('/', translationRoutes);
app.use('/', projectRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

module.exports = { app, server };
