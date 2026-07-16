const fs = require('fs');
const html = fs.readFileSync('admin.html', 'utf8');

// Extract all <script> blocks
const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = regex.exec(html)) !== null) {
  count++;
  const scriptContent = match[1];
  // If it's a module import script, skip JS compiling
  if (match[0].includes('src=')) {
    console.log(`Script ${count}: Module/External source (${match[0].trim()})`);
    continue;
  }
  try {
    new Function(scriptContent);
    console.log(`Script ${count}: Inline script is 100% valid JS syntax!`);
  } catch (err) {
    console.error(`Script ${count}: Syntax Error!`, err.message);
    // Print 10 lines around the error line if possible
    console.error(err.stack);
  }
}
