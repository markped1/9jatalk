const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8').trimEnd();

const splashEffect = [
  '',
  '  // Splash screen',
  '  useEffect(() => {',
  '    const t = setTimeout(() => setShowSplash(false), 2500);',
  '    return () => clearTimeout(t);',
  '  }, []);',
  ''
].join('\n');

const marker = '  // \u2500\u2500\u2500 Privacy protection';
c = c.replace(marker, splashEffect + marker);

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);
