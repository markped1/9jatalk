const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
lines[615] = "          <img src='/logo.png' className='w-28 h-28 object-contain mx-auto mb-2' alt='9jaTalk'/>";
lines[616] = '';
lines[617] = '';
fs.writeFileSync('src/App.tsx', lines.join('\n'), 'utf8');
console.log('done');
