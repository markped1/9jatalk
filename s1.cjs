const fs = require('fs');
const logic = fs.readFileSync('src/App_logic.txt', 'utf8').trimEnd();
const stateAdd = logic.replace(
  '  // \u2500\u2500\u2500 Auth state',
  "  const [activeTab, setActiveTab] = React.useState('chats');\n\n  // \u2500\u2500\u2500 Auth state"
);
fs.writeFileSync('src/App.tsx', stateAdd, 'utf8');
console.log('done', stateAdd.split('\n').length);
