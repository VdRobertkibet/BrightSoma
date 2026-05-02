const fs = require('fs');
const path = require('path');
const brainDir = 'C:\\Users\\Hp\\.gemini\\antigravity\\brain';
const targetFiles = ['components/RegisterStudent.tsx', 'components/SchoolRegistrationForm.tsx'];

const getLatestContent = (fileName) => {
  const baseName = path.basename(fileName);
  let bestContent = null;
  const dirs = fs.readdirSync(brainDir);
  for (const dir of dirs) {
    const logFile = path.join(brainDir, dir, '.system_generated', 'logs', 'overview.txt');
    if (fs.existsSync(logFile)) {
      const logContent = fs.readFileSync(logFile, 'utf8');
      const lines = logContent.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('"name":"write_to_file"') || line.includes('"name":"replace_file_content"')) {
          if (line.includes(baseName)) {
            try {
              const data = JSON.parse(line);
              if (data && data.tool_calls) {
                for (const call of data.tool_calls) {
                  if (call.name === 'write_to_file' || call.name === 'replace_file_content') {
                    if (call.args && (call.args.TargetFile && call.args.TargetFile.includes(baseName) || call.args.TargetFile === baseName)) {
                      if (call.args.CodeContent && call.args.CodeContent.length > 5000) {
                         bestContent = call.args.CodeContent;
                      } else if (call.args.ReplacementContent && call.args.ReplacementContent.length > 5000) {
                         bestContent = call.args.ReplacementContent;
                      }
                    }
                  }
                }
              }
            } catch(e) {}
          }
        }
      }
    }
  }

  if (bestContent) {
    console.log('Recovered ' + fileName + ' (' + bestContent.length + ' chars)');
    fs.writeFileSync(path.join('c:/Users/Hp/Downloads/BrightSoma', fileName), bestContent);
  } else {
    console.log('Could not find ' + fileName);
  }
};

targetFiles.forEach(getLatestContent);
