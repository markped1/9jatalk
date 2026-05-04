const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

// Find the login form lines
const startIdx = lines.findIndex(l => l.includes('Welcome to 9jaTalk'));
const endIdx = lines.findIndex(l => l.includes('Designed by Thompson Obosa') && l.includes('mt-4'));
console.log('start:', startIdx+1, 'end:', endIdx+1);
