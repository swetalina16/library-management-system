const app = require('./app');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 5000;

// Ensure data directory exists for SQLite file
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.listen(PORT, () => {
  console.log(`Library Management API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
