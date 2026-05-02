const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'App.tsx');
if (!fs.existsSync(filePath)) return;

let content = fs.readFileSync(filePath, 'utf-8');

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
console.log("App.tsx reverted");
