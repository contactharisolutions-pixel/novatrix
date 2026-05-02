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
      
      const requirePattern = /const\s+prisma\s*=\s*require\('.*?lib\/prisma'\)[\r\n;]*/g;
      
      if (content.match(requirePattern)) {
        // Calculate relative path from this file's directory to the server/lib directory
        const serverLibPath = path.join(__dirname, 'lib', 'prisma.js');
        let relPath = path.relative(path.dirname(fullPath), serverLibPath);
        // relPath will be something like ..\..\lib\prisma.js
        // We need to normalize to posix and drop the .js extension
        relPath = relPath.split(path.sep).join('/');
        relPath = relPath.replace(/\.js$/, '');
        if (!relPath.startsWith('.')) {
          relPath = './' + relPath;
        }
        
        const newRequire = `const prisma = require('${relPath}')\n`;
        
        content = content.replace(requirePattern, newRequire);
        fs.writeFileSync(fullPath, content);
        console.log(`Updated: ${fullPath} to ${newRequire.trim()}`);
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
