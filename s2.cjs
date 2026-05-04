const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8').trimEnd();

// Add splash + activeTab state before first useEffect
c = c.replace(
  "  const [userId",
  "  const [showSplash, setShowSplash] = useState(true);\n  const [activeTab, setActiveTab] = useState('chats');\n\n  const [userId"
);

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('State added. Lines:', c.split('\n').length);
