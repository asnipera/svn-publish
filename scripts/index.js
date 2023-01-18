const fs = require('fs');

fs.cpSync('./src/assets/svn', './dist/svn', { recursive: true });