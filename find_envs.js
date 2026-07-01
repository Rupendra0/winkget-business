const fs = require('fs');
const path = require('path');

function findEnv(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        findEnv(fullPath);
      }
    } else {
      if (file === '.env') {
        console.log(`=== Env: ${fullPath} ===`);
        console.log(fs.readFileSync(fullPath, 'utf8'));
      }
    }
  }
}

findEnv('D:\\Project\\winkget-business');
