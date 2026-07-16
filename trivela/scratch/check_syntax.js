const fs = require('fs');
let content = fs.readFileSync('src/features/admin/adminUI.js', 'utf8');
// Replace import/export statements
content = content.replace(/^import\s+.*$/gm, '// import');
content = content.replace(/^export\s+/gm, '/* export */ ');
try {
  new Function(content);
  console.log("Syntax is 100% valid JS!");
} catch (err) {
  console.error("Syntax Error found:", err.message);
  console.error(err.stack);
}
