const fs = require('fs');
const path = require('path');

const srcDir = path.join('C:', 'Users', 'Pc', '.gemini', 'antigravity', 'scratch', 'Projetos', 'Somos 1 Tattoo Studio', 'src');
const destDir = path.join('C:', 'Users', 'Pc', '.gemini', 'antigravity', 'scratch', 'Projetos', 'IndicaAi-SuperApp-Preview', 'src', 'components', 'galeria_module');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (fs.existsSync(srcDir)) {
  copyRecursiveSync(srcDir, destDir);
  console.log('Successfully copied all native Galeria IA source files to:', destDir);
} else {
  console.error('Source directory not found:', srcDir);
}
