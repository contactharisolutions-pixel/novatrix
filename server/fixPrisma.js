const fs = require('fs');
const path = require('path');

const dirsToSearch = ['routes', 'services', 'scripts', 'middleware'];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Look for the specific patterns
      const requirePattern = /const\s+\{\s*PrismaClient\s*\}\s*=\s*require\('@prisma\/client'\)[\r\n;]*/g;
      const initPattern = /const\s+prisma\s*=\s*new\s+PrismaClient\(\)[\r\n;]*/g;
      
      if (content.match(requirePattern) && content.match(initPattern)) {
        // Calculate relative path to lib/prisma.js
        const depth = fullPath.split(path.sep).length - 1; // Relative to server root where this script runs
        // if fullPath is routes\auth.js, depth is 2 (routes, auth.js)
        // relative path from routes/auth.js to lib/prisma is ../lib/prisma
        // if routes/admin/auth.js, depth is 3.
        const relativePrefix = '../'.repeat(fullPath.split(path.sep).length - 2) || './';
        const newRequire = `const prisma = require('${relativePrefix}lib/prisma')\n`;
        
        content = content.replace(requirePattern, '');
        content = content.replace(initPattern, newRequire);
        
        fs.writeFileSync(fullPath, content);
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

dirsToSearch.forEach(d => {
  const fullPath = path.join(__dirname, d);
  if (fs.existsSync(fullPath)) {
    processDir(fullPath);
  }
});

console.log("Done");
