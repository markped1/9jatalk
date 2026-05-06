const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
const start = c.indexOf('const setupSignalListener');
const end = c.indexOf('\n  };', start) + 5;

const newFn = const setupSignalListener = (uid) => {
    unsubSignals.current?.();
    unsubSignals.current = listenSignals(uid, (signal) => {
      if (signal.type === 'call:incoming') {
        try {
          const ctx = new AudioContext();
          const playRing = () => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(660, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
          };
          playRing();
          const ri = setInterval(playRing, 2000);
          (window)._ringInterval = ri;
        } catch (e) {}
        setCalling({
          active: true, incoming: true,
          type: signal.payload.callType,
          remoteId: signal.fromId,
          signal: signal.payload
        });
      } else if (signal.type === 'call:reject' || signal.type === 'call:end') {
        if ((window)._ringInterval) { clearInterval((window)._ringInterval); (window)._ringInterval = null; }
        cleanupCall();
      }
    });
  };

c = c.slice(0, start) + newFn + c.slice(end);
fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('Done');
