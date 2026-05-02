const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx')).map(f => path.join(componentsDir, f));

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  // Colors: blue -> orange
  content = content.replace(/blue-([1-9]00)/g, 'orange-$1');
  content = content.replace(/blue-50/g, 'orange-50');

  // Specific handling for previously customized dark theme in BoardingModule
  if (fileName.includes('BoardingModule')) {
      content = content.replace(/bg-black/g, 'bg-white');
      content = content.replace(/border-white\/[0-9]+/g, 'border-slate-200');
      content = content.replace(/bg-white\/[0-9]+/g, 'bg-slate-50');
      content = content.replace(/hover:bg-white\/[0-9]+/g, 'hover:bg-slate-100');
      content = content.replace(/divide-white\/[0-9]+/g, 'divide-slate-100');
      
      content = content.replace(/text-white/g, 'text-slate-800');
      content = content.replace(/bg-orange-600 text-slate-800/g, 'bg-orange-600 text-white');
      content = content.replace(/text-slate-800 rounded-2xl font-bold/g, 'text-white rounded-2xl font-bold');
      content = content.replace(/text-slate-800 hover:text-slate-800/g, 'text-slate-400 hover:text-slate-800');
  }

  // Rounded corners
  content = content.replace(/rounded-\[[0-9.]+rem\]/g, 'rounded-xl');
  content = content.replace(/rounded-3xl/g, 'rounded-xl');
  content = content.replace(/rounded-2xl/g, 'rounded-xl');
  content = content.replace(/rounded-\[0\.5rem\]/g, 'rounded-lg');

  // Floating effects & shadows
  content = content.replace(/shadow-lg\s+shadow-[a-z]+-[0-9]+\/[0-9]+/g, 'shadow-sm');
  content = content.replace(/shadow-md\s+shadow-[a-z]+-[0-9]+\/[0-9]+/g, 'shadow-sm');
  content = content.replace(/shadow-2xl/g, 'shadow-sm');
  content = content.replace(/shadow-xl/g, 'shadow-sm');
  content = content.replace(/shadow-lg/g, 'shadow-sm');
  content = content.replace(/shadow-md/g, 'shadow-sm');

  // Hover and active states
  content = content.replace(/\s*active:scale-95\s*/g, ' ');
  content = content.replace(/\s*group-hover:scale-[0-9]+\s*/g, ' ');
  content = content.replace(/\s*hover:-translate-y-[0-9]+\s*/g, ' ');
  content = content.replace(/\s*group-hover:translate-x-[0-9]+\s*/g, ' ');

  // Typography - remove tracking
  content = content.replace(/\s*tracking-widest\s*/g, ' ');
  content = content.replace(/\s*tracking-tight\s*/g, ' ');
  content = content.replace(/\s*tracking-\[.*?\]\s*/g, ' ');

  // Typography - remove uppercase
  content = content.replace(/\s*uppercase\s*/g, ' ');

  // Typography - font weights
  content = content.replace(/font-black/g, 'font-semibold');

  // Typography - text sizes (normalizing small text)
  content = content.replace(/text-\[9px\]/g, 'text-xs');
  content = content.replace(/text-\[10px\]/g, 'text-xs');
  content = content.replace(/text-\[11px\]/g, 'text-sm');

  // Clean up multiple spaces
  content = content.replace(/\s{2,}/g, ' ');

  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log("Reversion complete across all components.");
