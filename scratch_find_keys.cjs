const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) searchDir(full);
      else if (item.endsWith('.js') || item.endsWith('.cjs') || item.endsWith('.ts') || item.endsWith('.json') || item.endsWith('.env')) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('evolution') && (content.includes('apikey') || content.includes('apiKey') || content.includes('API_KEY'))) {
          console.log('FILE:', full);
          const lines = content.split('\n');
          lines.forEach(l => {
            if (/apikey|apiKey|API_KEY/i.test(l) && !l.includes('AIzaSy') && !l.includes('FIREBASE')) {
              console.log('   LINE:', l.trim().slice(0, 150));
            }
          });
        }
      }
    }
  } catch(e) {}
}

searchDir('c:\\Users\\Pc\\.gemini\\antigravity\\scratch\\Projetos');
