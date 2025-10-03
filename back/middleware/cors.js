const cors = require('cors');

const corsOptions = {
  origin: ['http://localhost:3000', 'https://translation.drannoc.duckdns.org'],
  optionsSuccessStatus: 200,
  credentials: true,
};

module.exports = cors(corsOptions);
