// Cloud entrypoint wrapper for Render / Railway / Cloud hosts
const path = require('path');

// Ensure working directory is the server directory
const serverDir = path.join(__dirname, 'server');
process.chdir(serverDir);

// Boot the server
require('./server/server.js');
