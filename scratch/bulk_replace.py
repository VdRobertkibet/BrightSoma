import os
import re

components_dir = 'components'
# Pairs of (regex pattern, replacement string)
replacements = [
    (r'rounded-\[3\.5rem\]', 'rounded-xl'),
    (r'rounded-\[3rem\]', 'rounded-xl'),
    (r'rounded-\[2\.5rem\]', 'rounded-xl'),
    (r'rounded-\[2rem\]', 'rounded-xl'),
    (r'rounded-\[1\.5rem\]', 'rounded-lg'),
    (r'rounded-\[1\.4rem\]', 'rounded-lg'),
    (r'rounded-\[0\.875rem\]', 'rounded-md'),
    (r'shadow-2xl', 'shadow-md'),
    (r'shadow-xl', 'shadow-sm'),
    (r'font-black', 'font-bold'),
    (r'uppercase tracking-widest', ''),
    (r'uppercase tracking-wider', ''),
    (r'tracking-widest uppercase', ''),
    (r'tracking-wider uppercase', ''),
]

for filename in os.listdir(components_dir):
    if filename.endswith('.tsx'):
        filepath = os.path.join(components_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        for pattern, replacement in replacements:
            content = re.sub(pattern, replacement, content)
            
        # Clean up any potential double spaces created by empty replacements
        content = re.sub(r' +', ' ', content)
        content = content.replace('className=" ', 'className="')
        content = content.replace(' "', '"')
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {filename}")
