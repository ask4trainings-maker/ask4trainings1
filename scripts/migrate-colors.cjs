const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
};

walk('./src', (filePath) => {
  if (filePath.endsWith('.astro') || filePath.endsWith('.tsx') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Backgrounds
    content = content.replace(/bg-\[\#090D16\]/g, 'bg-slate-50');
    content = content.replace(/bg-slate-900\/(\d+)/g, 'bg-white/$1');
    content = content.replace(/bg-slate-900/g, 'bg-white');
    content = content.replace(/bg-slate-dark/g, 'bg-slate-100');
    content = content.replace(/bg-slate-800\/(\d+)/g, 'bg-slate-100/$1');
    content = content.replace(/bg-slate-800/g, 'bg-slate-100');
    content = content.replace(/bg-\[\#0D3A2B\]\/90/g, 'bg-emerald-50');
    content = content.replace(/bg-\[\#2E2310\]\/90/g, 'bg-amber-50');
    content = content.replace(/bg-black\/80/g, 'bg-white/80');

    // Text colors
    content = content.replace(/text-surface-0/g, 'text-slate-900');
    
    // We only replace text-white and text-slate-300 if they are likely on main bg
    // But text-white on primary or accent bg should be kept.
    // Let's replace text-white with text-slate-800 generally but we'll see if it breaks some buttons.
    // Actually, `text-slate-300` -> `text-slate-600`
    // `text-slate-400` -> `text-slate-600`
    content = content.replace(/text-slate-300/g, 'text-slate-600');
    content = content.replace(/text-slate-400/g, 'text-slate-500');

    // Borders
    content = content.replace(/border-white\/10/g, 'border-slate-200');
    content = content.replace(/border-white\/5/g, 'border-slate-100');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
