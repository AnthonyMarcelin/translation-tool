const cors = require("cors");

const corsOptions = {
  origin: ["http://localhost:3000", "https://translate.drannocserver.com"],
  optionsSuccessStatus: 200,
  credentials: true,
};

module.exports = cors(corsOptions);
