const fs = require('fs');

fs.cpSync('./src/assets/svn', './dist/svn', { recursive: true });

let content = fs.readFileSync('./dist/index.js', { encoding: 'utf8' });
content = content.replace('"use strict";', `#!/usr/bin/env node
`);
fs.unlinkSync('./dist/index.js');
fs.writeFileSync('./dist/index.js', content, { encoding: 'utf8' });