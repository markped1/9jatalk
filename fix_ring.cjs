const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
const old = "} else if (signal.type === 'call:answer') {\n        // Stop ring\n        if ((window as any)._ringAudio) { (window as any)._ringAudio.pause(); (window as any)._ringAudio = null; }";
const rep = "} else if (signal.type === 'call:answer') {\n        // Stop ring\n        if ((window as any)._ringInterval) { clearInterval((window as any)._ringInterval); (window as any)._ringInterval = null; }\n        if ((window as any)._ringCtx) { try { (window as any)._ringCtx.close(); } catch(e){} (window as any)._ringCtx = null; }";
if(c.includes(old)) { c = c.replace(old, rep); console.log('replaced'); } else { console.log('not found'); }
fs.writeFileSync('src/App.tsx', c, 'utf8');
