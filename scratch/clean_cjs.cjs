const fs = require('fs');
const files = ['fix-staff-doc.cjs', 'update-pricing.cjs'];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let text = fs.readFileSync(file, 'utf8');
        text = text.replace(/orange/g, 'blue');
        fs.writeFileSync(file, text, 'utf8');
        console.log(`Replaced orange with blue in ${file}`);
    }
});
