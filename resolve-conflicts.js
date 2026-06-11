// هذا السكريبت يحل جميع merge conflicts بإختيار النسخة الجديدة (Neon)
const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/admin/Desktop/tawabeer/src';

function resolveConflicts(content) {
  // pattern: <<<<<<< HEAD\n...old...\n=======\n...new...\n>>>>>>> hash
  const conflictRegex = /<<<<<<< HEAD\n?([\s\S]*?)=======\n?([\s\S]*?)>>>>>>> [a-f0-9]+\n?/g;
  
  let match;
  let result = content;
  
  while ((match = conflictRegex.exec(content)) !== null) {
    const oldVersion = match[1];
    const newVersion = match[2];
    // Keep the new version (Neon/PostgreSQL)
    console.log(`  Resolved conflict: keeping new version (${newVersion.substring(0, 50)}...)`);
    result = result.replace(match[0], newVersion);
  }
  
  return result;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('<<<<<<< HEAD')) return false;
  
  console.log(`Processing: ${path.relative(srcDir, filePath)}`);
  const resolved = resolveConflicts(content);
  fs.writeFileSync(filePath, resolved);
  return true;
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      walkDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
      processFile(fullPath);
    }
  }
}

walkDir(srcDir);
console.log('\nDone! All conflicts resolved.');
